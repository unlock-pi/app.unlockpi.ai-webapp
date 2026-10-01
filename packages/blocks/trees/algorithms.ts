import {
  bstViolations,
  nextTreeNodeId,
  replaceNode,
  structureErrors,
  treeNode,
  treeParent,
  withChild,
} from "@/components/trees/model";
import type {
  ChildSide,
  TreeModel,
  TreeNode,
  TreePlan,
  TreePlanResult,
  TreeStep,
} from "@/components/trees/types";

type StepInput = Omit<TreeStep, "index">;

function stepWriter() {
  const steps: TreeStep[] = [];
  return {
    steps,
    add(input: StepInput) {
      steps.push({ ...input, index: steps.length + 1 });
    },
  };
}

function failed(operation: string, summary: string): TreePlan {
  return { operation, steps: [], result: { success: false, summary } };
}

function plan(operation: string, steps: TreeStep[], result: TreePlanResult): TreePlan {
  return { operation, steps, result };
}

function requiredBst(tree: TreeModel, operation: string): string | null {
  if (tree.kind !== "bst") return operation + " needs BST mode.";
  const structural = structureErrors(tree);
  if (structural.length) return structural[0];
  const violation = bstViolations(tree)[0];
  return violation ? "This tree is not a valid BST: " + violation.reason : null;
}

export type TraversalKind = "preorder" | "inorder" | "postorder" | "levelOrder";

export function buildTraversal(tree: TreeModel, kind: TraversalKind): TreePlan {
  const invalid = structureErrors(tree)[0];
  if (invalid) return failed(kind, invalid);
  if (!tree.rootId) return failed(kind, "Create a root before traversing.");
  const writer = stepWriter();
  const output: string[] = [];
  const visited: string[] = [];
  const visit = (node: TreeNode, queue?: string[]) => {
    output.push(String(node.value));
    visited.push(node.id);
    writer.add({
      type: "visit_node", description: "Visit " + node.value + ".",
      currentNodeId: node.id, visitedNodeIds: [...visited], output: [...output],
      queue: queue ? [...queue] : undefined,
    });
  };
  writer.add({ type: "start", description: "Begin " + kind + " traversal at the root.", currentNodeId: tree.rootId, visitedNodeIds: [], output: [], queue: kind === "levelOrder" ? [tree.rootId] : undefined });
  if (kind === "levelOrder") {
    const queue = [tree.rootId];
    while (queue.length) {
      const id = queue.shift()!;
      const node = treeNode(tree, id)!;
      writer.add({ type: "dequeue_node", description: "Take " + node.value + " from the queue.", currentNodeId: id, queue: [...queue], visitedNodeIds: [...visited], output: [...output] });
      visit(node, queue);
      for (const side of ["left", "right"] as const) {
        const child = treeNode(tree, side === "left" ? node.leftChildId : node.rightChildId);
        if (!child) continue;
        queue.push(child.id);
        writer.add({
          type: "enqueue_node", description: "Add " + child.value + " to the queue.",
          currentNodeId: child.id, activeEdge: { parentId: node.id, childId: child.id, side },
          queue: [...queue], visitedNodeIds: [...visited], output: [...output],
        });
      }
    }
  } else {
    const walk = (id: string) => {
      const node = treeNode(tree, id)!;
      writer.add({ type: "enter_node", description: "At " + node.value + ".", currentNodeId: id, visitedNodeIds: [...visited], output: [...output] });
      if (kind === "preorder") visit(node);
      const follow = (side: ChildSide, childId: string | null) => {
        if (!childId) return;
        const child = treeNode(tree, childId)!;
        writer.add({
          type: "traverse_edge", description: "Go " + side + " from " + node.value + " to " + child.value + ".",
          currentNodeId: id, activeEdge: { parentId: id, childId, side },
          visitedNodeIds: [...visited], output: [...output], direction: side,
        });
        walk(childId);
      };
      follow("left", node.leftChildId);
      if (kind === "inorder") visit(node);
      follow("right", node.rightChildId);
      if (kind === "postorder") visit(node);
      if (kind === "postorder") writer.add({ type: "exit_node", description: "Return from " + node.value + ".", currentNodeId: id, visitedNodeIds: [...visited], output: [...output] });
    };
    walk(tree.rootId);
  }
  writer.add({ type: "complete", description: kind + ": " + output.join(" → ") + ".", visitedNodeIds: [...visited], output: [...output], success: true });
  return plan(kind, writer.steps, { success: true, summary: kind + " complete.", order: output });
}

function relation(value: number, against: number): "<" | ">" | "=" {
  return value < against ? "<" : value > against ? ">" : "=";
}

function appendBstNode(tree: TreeModel, parent: TreeNode | null, side: ChildSide | null, node: TreeNode): TreeModel {
  if (!parent || !side) return { ...tree, rootId: node.id, nodes: [...tree.nodes, node] };
  return {
    ...tree,
    nodes: [...tree.nodes.map((item) => item.id === parent.id ? withChild(item, side, node.id) : item), node],
  };
}

export function buildBstInsert(tree: TreeModel, value: number): TreePlan {
  const error = requiredBst(tree, "Insert");
  if (error) return failed("bst_insert", error);
  if (!Number.isFinite(value)) return failed("bst_insert", "Enter a finite number to insert.");
  const writer = stepWriter();
  const visited: string[] = [];
  writer.add({ type: "start", description: "Find where " + value + " belongs.", currentNodeId: tree.rootId ?? undefined, visitedNodeIds: [] });
  let id = tree.rootId;
  let parent: TreeNode | null = null;
  let side: ChildSide | null = null;
  while (id) {
    const node = treeNode(tree, id)!;
    visited.push(id);
    const result = relation(value, node.value);
    writer.add({
      type: "compare", description: value + " " + result + " " + node.value + ".",
      currentNodeId: id, visitedNodeIds: [...visited],
      comparison: { value, against: node.value, relation: result },
      highlightedNodeIds: [...visited],
    });
    if (result === "=") {
      writer.add({ type: "complete", description: value + " is already in this BST.", currentNodeId: id, visitedNodeIds: [...visited], highlightedNodeIds: [...visited], success: false });
      return plan("bst_insert", writer.steps, { success: false, summary: "Value " + value + " already exists." });
    }
    side = result === "<" ? "left" : "right";
    parent = node;
    const nextId: string | null = side === "left" ? node.leftChildId : node.rightChildId;
    if (nextId) {
      writer.add({
        type: "traverse_edge", description: "Go " + side + " from " + node.value + ".",
        currentNodeId: node.id, activeEdge: { parentId: node.id, childId: nextId, side },
        visitedNodeIds: [...visited], highlightedNodeIds: [...visited], direction: side,
      });
    }
    id = nextId;
  }
  const newId = nextTreeNodeId(tree);
  const node: TreeNode = { id: newId, value, parentId: parent?.id ?? null, leftChildId: null, rightChildId: null };
  const next = appendBstNode(tree, parent, side, node);
  writer.add({
    type: "insert_node", description: "Place " + value + (parent && side ? " to the " + side + " of " + parent.value : " at the root") + ".",
    currentNodeId: newId, highlightedNodeIds: [newId], visitedNodeIds: [...visited, newId],
    treeAfter: next, eventType: "NODE_CREATED", eventNodeId: newId,
  });
  writer.add({ type: "complete", description: value + " is now in the BST.", currentNodeId: newId, visitedNodeIds: [...visited, newId], highlightedNodeIds: [newId], success: true });
  return plan("bst_insert", writer.steps, { success: true, summary: "Inserted " + value + ".", insertedNodeId: newId });
}

export function buildBstSearch(tree: TreeModel, value: number): TreePlan {
  const error = requiredBst(tree, "Search");
  if (error) return failed("bst_search", error);
  if (!Number.isFinite(value)) return failed("bst_search", "Enter a finite number to search for.");
  const writer = stepWriter();
  const visited: string[] = [];
  writer.add({ type: "start", description: "Search for " + value + ".", currentNodeId: tree.rootId ?? undefined, visitedNodeIds: [] });
  let id = tree.rootId;
  while (id) {
    const node = treeNode(tree, id)!;
    visited.push(id);
    const result = relation(value, node.value);
    writer.add({
      type: "compare", description: "Compare " + value + " with " + node.value + ".",
      currentNodeId: id, comparison: { value, against: node.value, relation: result },
      visitedNodeIds: [...visited], highlightedNodeIds: [...visited],
    });
    if (result === "=") {
      writer.add({ type: "found", description: "Found " + value + ".", currentNodeId: id, visitedNodeIds: [...visited], highlightedNodeIds: [...visited], success: true });
      writer.add({ type: "complete", description: "Search complete: " + value + " found.", currentNodeId: id, visitedNodeIds: [...visited], highlightedNodeIds: [...visited], success: true });
      return plan("bst_search", writer.steps, { success: true, summary: value + " found.", foundNodeId: id });
    }
    const side = result === "<" ? "left" : "right";
    const nextId: string | null = side === "left" ? node.leftChildId : node.rightChildId;
    if (nextId) writer.add({
      type: "traverse_edge", description: "Go " + side + " from " + node.value + ".",
      currentNodeId: id, activeEdge: { parentId: id, childId: nextId, side },
      visitedNodeIds: [...visited], highlightedNodeIds: [...visited], direction: side,
    });
    id = nextId;
  }
  writer.add({ type: "not_found", description: value + " is not in this tree.", visitedNodeIds: [...visited], highlightedNodeIds: [...visited], success: false });
  writer.add({ type: "complete", description: "Search finished without a match.", visitedNodeIds: [...visited], highlightedNodeIds: [...visited], success: false });
  return plan("bst_search", writer.steps, { success: false, summary: value + " was not found.", foundNodeId: null });
}

/** Removes a node that has at most one child, reconnecting that child. */
function removePhysicalNode(tree: TreeModel, id: string): TreeModel {
  const node = treeNode(tree, id)!;
  const parent = treeParent(tree, id);
  const replacementId = node.leftChildId ?? node.rightChildId;
  return {
    ...tree,
    rootId: tree.rootId === id ? replacementId : tree.rootId,
    nodes: tree.nodes
      .filter((item) => item.id !== id)
      .map((item) => {
        if (parent && item.id === parent.id) return withChild(item, parent.leftChildId === id ? "left" : "right", replacementId);
        if (replacementId && item.id === replacementId) return { ...item, parentId: parent?.id ?? null };
        return item;
      }),
  };
}

export function buildBstDelete(tree: TreeModel, value: number): TreePlan {
  const error = requiredBst(tree, "Delete");
  if (error) return failed("bst_delete", error);
  if (!Number.isFinite(value)) return failed("bst_delete", "Enter a finite number to delete.");
  const writer = stepWriter();
  const visited: string[] = [];
  writer.add({ type: "start", description: "Find " + value + " before removing it.", currentNodeId: tree.rootId ?? undefined, visitedNodeIds: [] });
  let id = tree.rootId;
  let target: TreeNode | null = null;
  while (id) {
    const node = treeNode(tree, id)!;
    visited.push(id);
    const result = relation(value, node.value);
    writer.add({
      type: "compare", description: "Compare " + value + " with " + node.value + ".",
      currentNodeId: id, comparison: { value, against: node.value, relation: result },
      visitedNodeIds: [...visited], highlightedNodeIds: [...visited],
    });
    if (result === "=") { target = node; break; }
    const side = result === "<" ? "left" : "right";
    const nextId: string | null = side === "left" ? node.leftChildId : node.rightChildId;
    if (nextId) writer.add({
      type: "traverse_edge", description: "Go " + side + " from " + node.value + ".",
      currentNodeId: id, activeEdge: { parentId: id, childId: nextId, side },
      visitedNodeIds: [...visited], highlightedNodeIds: [...visited], direction: side,
    });
    id = nextId;
  }
  if (!target) {
    writer.add({ type: "complete", description: value + " is not in this BST.", visitedNodeIds: [...visited], highlightedNodeIds: [...visited], success: false });
    return plan("bst_delete", writer.steps, { success: false, summary: value + " was not found." });
  }
  writer.add({ type: "found", description: "Found " + value + ". Decide how to reconnect the tree.", currentNodeId: target.id, visitedNodeIds: [...visited], highlightedNodeIds: [target.id] });
  let physical = target;
  let working = tree;
  if (target.leftChildId && target.rightChildId) {
    let successor = treeNode(tree, target.rightChildId)!;
    writer.add({
      type: "traverse_edge", description: "Look right for the next larger value.",
      currentNodeId: target.id,
      activeEdge: { parentId: target.id, childId: successor.id, side: "right" },
      visitedNodeIds: [...visited], highlightedNodeIds: [target.id, successor.id], direction: "right",
    });
    while (successor.leftChildId) {
      const next = treeNode(tree, successor.leftChildId)!;
      writer.add({
        type: "traverse_edge", description: "Keep going left to the smallest larger value.",
        currentNodeId: successor.id,
        activeEdge: { parentId: successor.id, childId: next.id, side: "left" },
        visitedNodeIds: [...visited], highlightedNodeIds: [target.id, next.id], direction: "left",
      });
      successor = next;
    }
    physical = successor;
    working = replaceNode(tree, { ...target, value: successor.value });
    writer.add({
      type: "replace_value", description: "Replace " + value + " with its successor " + successor.value + ".",
      currentNodeId: target.id, highlightedNodeIds: [target.id, successor.id],
      visitedNodeIds: [...visited], displayValues: { [target.id]: successor.value },
    });
  }
  writer.add({
    type: "mark_deleting", description: "Remove " + physical.value + (physical.id === target.id ? "." : " from its old position."),
    currentNodeId: physical.id, highlightedNodeIds: [physical.id], visitedNodeIds: [...visited],
    displayValues: physical.id === target.id ? undefined : { [target.id]: physical.value },
  });
  const finalTree = removePhysicalNode(working, physical.id);
  writer.add({
    type: "delete_node", description: "Reconnect the remaining branch.",
    currentNodeId: physical.parentId ?? undefined, highlightedNodeIds: [],
    visitedNodeIds: visited.filter((nodeId) => nodeId !== physical.id),
    treeAfter: finalTree, eventType: "NODE_REMOVED", eventNodeId: physical.id,
  });
  writer.add({ type: "complete", description: value + " removed; the tree has settled.", highlightedNodeIds: [], success: true });
  return plan("bst_delete", writer.steps, { success: true, summary: "Deleted " + value + ".", deletedNodeId: physical.id });
}

export function buildBstValidation(tree: TreeModel): TreePlan {
  const writer = stepWriter();
  const structural = structureErrors(tree);
  writer.add({ type: "start", description: "Check every node against its allowed range.", currentNodeId: tree.rootId ?? undefined, visitedNodeIds: [] });
  if (structural.length) {
    writer.add({ type: "violation", description: structural[0], success: false });
    writer.add({ type: "complete", description: "This is not a valid tree.", success: false });
    return plan("is_bst", writer.steps, { success: false, valid: false, summary: "Tree structure is invalid.", violations: [{ nodeId: tree.rootId ?? "", reason: structural[0] }] });
  }
  const visited: string[] = [];
  const violations: Array<{ nodeId: string; reason: string }> = [];
  const inspect = (id: string | null, min: number, max: number) => {
    if (!id) return;
    const node = treeNode(tree, id)!;
    visited.push(id);
    writer.add({ type: "validate_node", description: "Check " + node.value + " against its allowed range.", currentNodeId: id, visitedNodeIds: [...visited], highlightedNodeIds: [...violations.map((item) => item.nodeId)] });
    if (!(node.value > min && node.value < max)) {
      const reason = node.value + " is outside its allowed range.";
      violations.push({ nodeId: id, reason });
      writer.add({ type: "violation", description: reason, currentNodeId: id, visitedNodeIds: [...visited], highlightedNodeIds: violations.map((item) => item.nodeId), success: false });
    }
    if (node.leftChildId) {
      writer.add({ type: "traverse_edge", description: "Check the left subtree of " + node.value + ".", currentNodeId: id, activeEdge: { parentId: id, childId: node.leftChildId, side: "left" }, visitedNodeIds: [...visited] });
      inspect(node.leftChildId, min, Math.min(max, node.value));
    }
    if (node.rightChildId) {
      writer.add({ type: "traverse_edge", description: "Check the right subtree of " + node.value + ".", currentNodeId: id, activeEdge: { parentId: id, childId: node.rightChildId, side: "right" }, visitedNodeIds: [...visited] });
      inspect(node.rightChildId, Math.max(min, node.value), max);
    }
  };
  inspect(tree.rootId, -Infinity, Infinity);
  const valid = violations.length === 0;
  writer.add({ type: "complete", description: valid ? "Every node follows the BST rule." : "Found " + violations.length + " BST violation" + (violations.length === 1 ? "" : "s") + ".", visitedNodeIds: [...visited], highlightedNodeIds: violations.map((item) => item.nodeId), success: valid });
  return plan("is_bst", writer.steps, { success: valid, valid, summary: valid ? "This is a valid BST." : "This is not a valid BST.", violations });
}
