import type { ChildSide, TreeKind, TreeModel, TreeNode } from "@/components/trees/types";

export function emptyTree(kind: TreeKind = "binary"): TreeModel {
  return kind === "heap"
    ? { kind, rootId: null, nodes: [], heap: { type: "min", entries: [] } }
    : { kind, rootId: null, nodes: [] };
}

export function treeNode(tree: TreeModel, id: string | null | undefined): TreeNode | null {
  return id ? tree.nodes.find((node) => node.id === id) ?? null : null;
}

export function treeChildren(tree: TreeModel, id: string) {
  const node = treeNode(tree, id);
  if (!node) return [];
  return [treeNode(tree, node.leftChildId), treeNode(tree, node.rightChildId)].filter(
    (child): child is TreeNode => child !== null,
  );
}

export function treeParent(tree: TreeModel, id: string) {
  return treeNode(tree, treeNode(tree, id)?.parentId);
}

export function treeSibling(tree: TreeModel, id: string) {
  const parent = treeParent(tree, id);
  return parent ? treeNode(tree, parent.leftChildId === id ? parent.rightChildId : parent.leftChildId) : null;
}

export function treeDepth(tree: TreeModel, id: string): number {
  let current = treeNode(tree, id);
  if (!current) return -1;
  const seen = new Set<string>();
  let depth = 0;
  while (current.parentId) {
    if (seen.has(current.id)) return -1;
    seen.add(current.id);
    current = treeNode(tree, current.parentId);
    if (!current) return -1;
    depth++;
  }
  return current.id === tree.rootId ? depth : -1;
}

export function treeHeight(tree: TreeModel, id: string | null = tree.rootId): number {
  if (!id) return -1;
  const visit = (nodeId: string, path: Set<string>): number => {
    if (path.has(nodeId)) return -1;
    const node = treeNode(tree, nodeId);
    if (!node) return -1;
    const next = new Set(path).add(nodeId);
    return 1 + Math.max(
      node.leftChildId ? visit(node.leftChildId, next) : -1,
      node.rightChildId ? visit(node.rightChildId, next) : -1,
    );
  };
  return visit(id, new Set());
}

export function subtreeNodeIds(tree: TreeModel, rootId: string): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    const node = treeNode(tree, id);
    if (!node) return;
    seen.add(id);
    output.push(id);
    if (node.leftChildId) visit(node.leftChildId);
    if (node.rightChildId) visit(node.rightChildId);
  };
  visit(rootId);
  return output;
}

export function treeSubtree(tree: TreeModel, rootId: string): TreeModel | null {
  if (!treeNode(tree, rootId)) return null;
  const ids = new Set(subtreeNodeIds(tree, rootId));
  return {
    kind: tree.kind,
    rootId,
    nodes: tree.nodes.filter((node) => ids.has(node.id)).map((node) =>
      node.id === rootId ? { ...node, parentId: null } : { ...node },
    ),
  };
}

export function nextTreeNodeId(tree: TreeModel): string {
  let index = 1;
  while (tree.nodes.some((node) => node.id === "n" + index)) index++;
  return "n" + index;
}

export function childId(node: TreeNode, side: ChildSide): string | null {
  return side === "left" ? node.leftChildId : node.rightChildId;
}

export function withChild(node: TreeNode, side: ChildSide, id: string | null): TreeNode {
  return side === "left" ? { ...node, leftChildId: id } : { ...node, rightChildId: id };
}

export function replaceNode(tree: TreeModel, replacement: TreeNode): TreeModel {
  return { ...tree, nodes: tree.nodes.map((node) => node.id === replacement.id ? replacement : node) };
}

export function structureErrors(tree: TreeModel): string[] {
  if (!tree.rootId) return tree.nodes.length ? ["A tree with nodes needs a root."] : [];
  const root = treeNode(tree, tree.rootId);
  if (!root) return ["Root node does not exist."];
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const node of tree.nodes) {
    if (ids.has(node.id)) errors.push("Duplicate node ID " + node.id + ".");
    ids.add(node.id);
    if (!Number.isFinite(node.value)) errors.push("Node " + node.id + " needs a finite value.");
    if (node.leftChildId && node.leftChildId === node.rightChildId) errors.push("Node " + node.id + " uses one child twice.");
  }
  if (root.parentId) errors.push("The root cannot have a parent.");
  const seen = new Set<string>();
  const path = new Set<string>();
  const visit = (id: string, expectedParent: string | null) => {
    const node = treeNode(tree, id);
    if (!node) {
      errors.push("Referenced child " + id + " does not exist.");
      return;
    }
    if (path.has(id)) {
      errors.push("Cycle detected at " + id + ".");
      return;
    }
    if (seen.has(id)) {
      errors.push("Node " + id + " has more than one parent.");
      return;
    }
    seen.add(id);
    if (node.parentId !== expectedParent) errors.push("Parent link for " + id + " is inconsistent.");
    path.add(id);
    if (node.leftChildId) visit(node.leftChildId, id);
    if (node.rightChildId) visit(node.rightChildId, id);
    path.delete(id);
  };
  visit(tree.rootId, null);
  for (const node of tree.nodes) if (!seen.has(node.id)) errors.push("Node " + node.id + " is disconnected.");
  return errors;
}

export type BstViolation = { nodeId: string; reason: string };

export function bstViolations(tree: TreeModel): BstViolation[] {
  const violations: BstViolation[] = [];
  const seen = new Set<string>();
  const visit = (id: string | null, min: number, max: number) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    const node = treeNode(tree, id);
    if (!node) return;
    if (!(node.value > min && node.value < max)) {
      violations.push({
        nodeId: id,
        reason: "Value " + node.value + " must be between " +
          (Number.isFinite(min) ? min : "−∞") + " and " +
          (Number.isFinite(max) ? max : "∞") + ".",
      });
    }
    visit(node.leftChildId, min, Math.min(max, node.value));
    visit(node.rightChildId, Math.max(min, node.value), max);
  };
  visit(tree.rootId, -Infinity, Infinity);
  return violations;
}
