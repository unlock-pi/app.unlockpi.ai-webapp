import { buildBstDelete, buildBstInsert } from "./algorithms";
import { bstViolations, structureErrors, treeHeight, treeNode } from "./model";
import type { TreeModel, TreeNode, TreePlan, TreeStep } from "./types";

type RotationCase = "LL" | "RR" | "LR" | "RL";
type StepInput = Omit<TreeStep, "index">;
type Violation = { nodeId: string; reason: string };

export function avlBalanceFactor(tree: TreeModel, id: string): number {
  const node = treeNode(tree, id);
  if (!node) return 0;
  return treeHeight(tree, node.leftChildId) - treeHeight(tree, node.rightChildId);
}

export function avlBalanceFactors(tree: TreeModel): Record<string, number> {
  return Object.fromEntries(tree.nodes.map((node) => [node.id, avlBalanceFactor(tree, node.id)]));
}

export function avlViolations(tree: TreeModel): Violation[] {
  return tree.nodes.flatMap((node) => {
    const balance = avlBalanceFactor(tree, node.id);
    return Math.abs(balance) > 1
      ? [{ nodeId: node.id, reason: "Node " + node.value + " has balance factor " + (balance > 0 ? "+" : "") + balance + "." }]
      : [];
  });
}

function replaceNodes(tree: TreeModel, replacements: TreeNode[], rootId = tree.rootId): TreeModel {
  const changed = new Map(replacements.map((node) => [node.id, node]));
  return { ...tree, rootId, nodes: tree.nodes.map((node) => changed.get(node.id) ?? node) };
}

/** A single structural rotation. Each returned snapshot is independently renderable. */
export function rotateLeft(tree: TreeModel, pivotId: string): TreeModel {
  const pivot = treeNode(tree, pivotId);
  const child = treeNode(tree, pivot?.rightChildId);
  if (!pivot || !child) throw new Error("Left rotation needs a right child.");
  const parent = treeNode(tree, pivot.parentId);
  const beta = treeNode(tree, child.leftChildId);
  const replacements: TreeNode[] = [
    { ...pivot, parentId: child.id, rightChildId: beta?.id ?? null },
    { ...child, parentId: parent?.id ?? null, leftChildId: pivot.id },
  ];
  if (beta) replacements.push({ ...beta, parentId: pivot.id });
  if (parent) replacements.push({
    ...parent,
    leftChildId: parent.leftChildId === pivot.id ? child.id : parent.leftChildId,
    rightChildId: parent.rightChildId === pivot.id ? child.id : parent.rightChildId,
  });
  return replaceNodes(tree, replacements, parent ? tree.rootId : child.id);
}

export function rotateRight(tree: TreeModel, pivotId: string): TreeModel {
  const pivot = treeNode(tree, pivotId);
  const child = treeNode(tree, pivot?.leftChildId);
  if (!pivot || !child) throw new Error("Right rotation needs a left child.");
  const parent = treeNode(tree, pivot.parentId);
  const beta = treeNode(tree, child.rightChildId);
  const replacements: TreeNode[] = [
    { ...pivot, parentId: child.id, leftChildId: beta?.id ?? null },
    { ...child, parentId: parent?.id ?? null, rightChildId: pivot.id },
  ];
  if (beta) replacements.push({ ...beta, parentId: pivot.id });
  if (parent) replacements.push({
    ...parent,
    leftChildId: parent.leftChildId === pivot.id ? child.id : parent.leftChildId,
    rightChildId: parent.rightChildId === pivot.id ? child.id : parent.rightChildId,
  });
  return replaceNodes(tree, replacements, parent ? tree.rootId : child.id);
}

function writer() {
  const steps: TreeStep[] = [];
  return {
    steps,
    add(input: StepInput) { steps.push({ ...input, index: steps.length + 1 }); },
    copy(step: TreeStep) {
      const { index: _index, ...input } = step;
      void _index;
      steps.push({ ...input, treeAfter: input.treeAfter ? { ...input.treeAfter, kind: "avl" } : undefined, index: steps.length + 1 });
    },
  };
}

function postorder(tree: TreeModel): string[] {
  const result: string[] = [];
  const visit = (id: string | null) => {
    const node = treeNode(tree, id);
    if (!node) return;
    visit(node.leftChildId);
    visit(node.rightChildId);
    result.push(node.id);
  };
  visit(tree.rootId);
  return result;
}

export function buildAvlValidation(tree: TreeModel): TreePlan {
  const out = writer();
  out.add({ type: "start", description: "Check the BST rule and every node's balance.", currentNodeId: tree.rootId ?? undefined });
  const structural = structureErrors(tree);
  const bst = structural.length ? [] : bstViolations(tree);
  const balances = structural.length ? [] : avlViolations(tree);
  const violations: Violation[] = [
    ...structural.map((reason) => ({ nodeId: tree.rootId ?? "", reason })),
    ...bst,
    ...balances,
  ];
  for (const violation of structural) out.add({ type: "violation", description: violation, currentNodeId: tree.rootId ?? undefined, success: false });
  for (const violation of bst) out.add({ type: "violation", description: violation.reason, currentNodeId: violation.nodeId, highlightedNodeIds: [violation.nodeId], success: false });
  if (!structural.length) {
    for (const id of postorder(tree)) {
      const node = treeNode(tree, id)!;
      const factor = avlBalanceFactor(tree, id);
      out.add({
        type: "calculate_balance",
        description: "Node " + node.value + ": height " + treeHeight(tree, id) + ", balance " + (factor > 0 ? "+" : "") + factor + ".",
        currentNodeId: id, height: treeHeight(tree, id), balanceFactor: factor,
        highlightedNodeIds: Math.abs(factor) > 1 ? [id] : [],
      });
      if (Math.abs(factor) > 1) out.add({
        type: "violation", description: "Node " + node.value + " is unbalanced.",
        currentNodeId: id, balanceFactor: factor, highlightedNodeIds: [id], success: false,
      });
    }
  }
  const valid = violations.length === 0;
  out.add({
    type: "complete",
    description: valid ? "Every node is balanced and follows the BST rule." : "Found " + violations.length + " AVL violation" + (violations.length === 1 ? "" : "s") + ".",
    highlightedNodeIds: violations.map((item) => item.nodeId), success: valid,
  });
  return {
    operation: "validate_avl", steps: out.steps,
    result: {
      success: valid, valid, summary: valid ? "This is a valid AVL tree." : "This is not a valid AVL tree.",
      violations, balanceFactors: avlBalanceFactors(tree),
    },
  };
}

function errorPlan(operation: string, message: string): TreePlan {
  return { operation, steps: [], result: { success: false, summary: message } };
}

function rebalance(out: ReturnType<typeof writer>, initial: TreeModel): { tree: TreeModel; cases: RotationCase[] } {
  let tree = initial;
  const cases: RotationCase[] = [];
  const limit = Math.max(4, tree.nodes.length * 3);
  for (let pass = 0; pass < limit; pass++) {
    let pivotId: string | null = null;
    for (const id of postorder(tree)) {
      const node = treeNode(tree, id)!;
      const factor = avlBalanceFactor(tree, id);
      out.add({
        type: "calculate_height", description: "Update height of " + node.value + " to " + treeHeight(tree, id) + ".",
        currentNodeId: id, height: treeHeight(tree, id),
      });
      out.add({
        type: "calculate_balance",
        description: "Balance at " + node.value + " is " + (factor > 0 ? "+" : "") + factor + ".",
        currentNodeId: id, height: treeHeight(tree, id), balanceFactor: factor,
      });
      if (Math.abs(factor) > 1) { pivotId = id; break; }
    }
    if (!pivotId) return { tree, cases };
    const pivot = treeNode(tree, pivotId)!;
    const factor = avlBalanceFactor(tree, pivotId);
    const leftHeavy = factor > 1;
    const childId = leftHeavy ? pivot.leftChildId! : pivot.rightChildId!;
    const childFactor = avlBalanceFactor(tree, childId);
    const rotationCase: RotationCase = leftHeavy
      ? childFactor >= 0 ? "LL" : "LR"
      : childFactor <= 0 ? "RR" : "RL";
    cases.push(rotationCase);
    out.add({
      type: "detect_imbalance", description: pivot.value + " is unbalanced (" + (factor > 0 ? "+" : "") + factor + ").",
      currentNodeId: pivotId, balanceFactor: factor, highlightedNodeIds: [pivotId, childId],
    });
    out.add({
      type: "identify_rotation", description: rotationCase + " case: " + (rotationCase === "LL" ? "rotate right" : rotationCase === "RR" ? "rotate left" : "make two rotations") + ".",
      currentNodeId: pivotId, rotationCase, balanceFactor: factor, highlightedNodeIds: [pivotId, childId],
    });
    if (rotationCase === "LR") {
      tree = rotateLeft(tree, childId);
      out.add({
        type: "rotate_left", description: "Rotate left around " + treeNode(tree, childId)!.value + ".",
        currentNodeId: childId, rotationCase, highlightedNodeIds: [childId, pivotId],
        treeAfter: tree,
      });
    } else if (rotationCase === "RL") {
      tree = rotateRight(tree, childId);
      out.add({
        type: "rotate_right", description: "Rotate right around " + treeNode(tree, childId)!.value + ".",
        currentNodeId: childId, rotationCase, highlightedNodeIds: [childId, pivotId],
        treeAfter: tree,
      });
    }
    tree = leftHeavy ? rotateRight(tree, pivotId) : rotateLeft(tree, pivotId);
    out.add({
      type: leftHeavy ? "rotate_right" : "rotate_left",
      description: "Rotate " + (leftHeavy ? "right" : "left") + " around " + pivot.value + ".",
      currentNodeId: pivotId, rotationCase, highlightedNodeIds: [pivotId, treeNode(tree, pivotId)!.parentId!],
      treeAfter: tree,
    });
    out.add({
      type: "rebalance", description: "The branch is balanced again.",
      currentNodeId: treeNode(tree, pivotId)?.parentId ?? undefined,
      highlightedNodeIds: [pivotId],
    });
  }
  throw new Error("AVL rebalance did not converge.");
}

function mutation(tree: TreeModel, value: number, kind: "insert" | "delete"): TreePlan {
  const operation = kind === "insert" ? "avl_insert" : "avl_delete";
  if (tree.kind !== "avl") return errorPlan(operation, "Switch to AVL mode first.");
  if (!Number.isFinite(value)) return errorPlan(operation, "Enter a finite number.");
  const validation = buildAvlValidation(tree);
  if (!validation.result.valid) return errorPlan(operation, "Fix the existing AVL violations before changing this tree.");
  // Reuse the BST search, successor deletion, and delayed model snapshots.
  const base = kind === "insert"
    ? buildBstInsert({ ...tree, kind: "bst" }, value)
    : buildBstDelete({ ...tree, kind: "bst" }, value);
  if (!base.steps.length) return errorPlan(operation, base.result.summary);
  const out = writer();
  for (const step of base.steps) {
    if (step.type === "complete") continue;
    out.copy(step);
  }
  if (!base.result.success) {
    out.add({ type: "complete", description: base.result.summary, success: false });
    return { operation, steps: out.steps, result: base.result };
  }
  const lastMutation = [...out.steps].reverse().find((step) => step.treeAfter);
  const afterBst = lastMutation?.treeAfter ?? tree;
  const result = rebalance(out, afterBst);
  const finalValidation = buildAvlValidation(result.tree);
  if (!finalValidation.result.valid) throw new Error("AVL operation produced an invalid tree.");
  out.add({
    type: "complete",
    description: (kind === "insert" ? "Inserted " : "Deleted ") + value + ". The AVL tree is balanced.",
    highlightedNodeIds: kind === "insert" && base.result.insertedNodeId ? [base.result.insertedNodeId] : [],
    success: true,
  });
  return {
    operation, steps: out.steps,
    result: {
      ...base.result, summary: (kind === "insert" ? "Inserted " : "Deleted ") + value + " and balanced the AVL tree.",
      valid: true, balanceFactors: avlBalanceFactors(result.tree), rotationCases: result.cases,
    },
  };
}

export function buildAvlInsert(tree: TreeModel, value: number): TreePlan {
  return mutation(tree, value, "insert");
}

export function buildAvlDelete(tree: TreeModel, value: number): TreePlan {
  return mutation(tree, value, "delete");
}
