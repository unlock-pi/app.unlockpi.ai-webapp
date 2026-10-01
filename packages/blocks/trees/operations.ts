import { avlBalanceFactor } from "@/components/trees/avl";
import {
  bstViolations,
  childId,
  emptyTree,
  nextTreeNodeId,
  replaceNode,
  structureErrors,
  subtreeNodeIds,
  treeChildren,
  treeDepth,
  treeHeight,
  treeNode,
  treeParent,
  treeSibling,
  treeSubtree,
  withChild,
} from "@/components/trees/model";
import type {
  ChildSide,
  TreeEvent,
  TreeEventType,
  TreeExecutionState,
  TreeKind,
  TreeModel,
  TreeNode,
  TreeOperationResult,
  TreePlan,
  TreePlanResult,
  TreeRuntimeState,
  TreeViewState,
} from "@/components/trees/types";

const idleExecution = (): TreeExecutionState => ({
  status: "idle", operation: null, currentStep: 0, totalSteps: 0,
  steps: [], step: null, result: null,
});

export function createTreeState(tree: TreeModel = emptyTree()): TreeRuntimeState {
  return {
    tree,
    view: { selectedNodeId: null, highlightedNodeIds: [] },
    execution: idleExecution(),
    events: [],
    eventSequence: 0,
  };
}

function fail<T>(summary: string, state: TreeRuntimeState): TreeOperationResult<T> {
  return { ok: false, summary, error: summary, state };
}

function commit<T>(
  state: TreeRuntimeState,
  tree: TreeModel,
  view: TreeViewState,
  execution: TreeExecutionState,
  type: TreeEventType,
  summary: string,
  data?: T,
  nodeId?: string,
): TreeOperationResult<T> {
  const event: TreeEvent = { id: state.eventSequence + 1, type, summary, nodeId };
  return {
    ok: true, summary, data, event,
    state: {
      tree, view, execution, eventSequence: event.id,
      events: [...state.events, event].slice(-24),
    },
  };
}

function validValue(value: number) {
  return Number.isFinite(value);
}

function bstError(tree: TreeModel) {
  const structure = structureErrors(tree);
  if (structure.length) return structure[0];
  if (tree.kind === "bst") {
    const violation = bstViolations(tree)[0];
    if (violation) return "This would break the BST rule: " + violation.reason;
  }
  return null;
}

export function createTree(kind: TreeKind = "binary"): TreeOperationResult<TreeModel> {
  const state = createTreeState(emptyTree(kind));
  return commit(state, state.tree, state.view, state.execution, "TREE_CREATED", "Empty " + (kind === "heap" ? "min heap" : kind === "avl" ? "AVL tree" : kind === "bst" ? "BST" : "binary tree") + " created.", state.tree);
}

export function createRoot(
  state: TreeRuntimeState,
  input: { value: number; id?: string },
): TreeOperationResult<TreeNode> {
  if (state.tree.kind === "heap") return fail("Use Heap Insert so the array and tree stay synchronized.", state);
  if (!validValue(input.value)) return fail("Root value must be a finite number.", state);
  if (state.tree.rootId || state.tree.nodes.length) return fail("The tree already has a root.", state);
  const id = input.id?.trim() || nextTreeNodeId(state.tree);
  const root: TreeNode = { id, value: input.value, parentId: null, leftChildId: null, rightChildId: null };
  const tree = { ...state.tree, rootId: id, nodes: [root] };
  return commit(state, tree, state.view, idleExecution(), "NODE_CREATED", "Root " + input.value + " created.", root, id);
}

export type AddTreeNodeInput = {
  value: number;
  id?: string;
  parentId?: string;
  side?: ChildSide;
};

export function addNode(state: TreeRuntimeState, input: AddTreeNodeInput): TreeOperationResult<TreeNode> {
  if (state.tree.kind === "heap") return fail("Use Heap Insert so the array and tree stay synchronized.", state);
  if (state.tree.kind === "avl") return fail("Use AVL Insert so the tree stays balanced.", state);
  if (!validValue(input.value)) return fail("Node value must be a finite number.", state);
  if (!state.tree.rootId) return createRoot(state, input);
  const id = input.id?.trim() || nextTreeNodeId(state.tree);
  if (state.tree.nodes.some((node) => node.id === id)) return fail("Node ID " + id + " already exists.", state);
  let parent = treeNode(state.tree, input.parentId);
  let side = input.side;
  if (input.parentId && !parent) return fail("Parent node " + input.parentId + " does not exist.", state);
  if (!parent && state.tree.kind === "bst") {
    let currentId: string | null = state.tree.rootId;
    while (currentId) {
      const candidate = treeNode(state.tree, currentId)!;
      if (input.value === candidate.value) return fail("Value " + input.value + " already exists in this BST.", state);
      side = input.value < candidate.value ? "left" : "right";
      const nextId: string | null = childId(candidate, side);
      if (!nextId) { parent = candidate; break; }
      currentId = nextId;
    }
  }
  if (!parent) {
    const queue = [state.tree.rootId];
    for (let index = 0; index < queue.length; index++) {
      const candidate = treeNode(state.tree, queue[index])!;
      if (!candidate.leftChildId) { parent = candidate; side = "left"; break; }
      if (!candidate.rightChildId) { parent = candidate; side = "right"; break; }
      queue.push(candidate.leftChildId, candidate.rightChildId);
    }
  }
  if (!parent) return fail("No place is available for the new node.", state);
  side ??= !parent.leftChildId ? "left" : "right";
  if (childId(parent, side)) return fail("The " + side + " side of " + parent.value + " is already occupied.", state);
  const node: TreeNode = { id, value: input.value, parentId: parent.id, leftChildId: null, rightChildId: null };
  const tree = {
    ...state.tree,
    nodes: [...state.tree.nodes.map((item) => item.id === parent!.id ? withChild(item, side!, id) : item), node],
  };
  const error = bstError(tree);
  if (error) return fail(error, state);
  return commit(state, tree, state.view, idleExecution(), "NODE_CREATED", "Added " + input.value + " to the " + side + " of " + parent.value + ".", node, id);
}

export function removeNode(state: TreeRuntimeState, id: string): TreeOperationResult<{ removedIds: string[] }> {
  if (state.tree.kind === "heap") return fail("Use Extract so the heap property is preserved.", state);
  if (state.tree.kind === "avl") return fail("Use AVL Delete so the tree stays balanced.", state);
  const node = treeNode(state.tree, id);
  if (!node) return fail("Node " + id + " does not exist.", state);
  const removedIds = subtreeNodeIds(state.tree, id);
  const removed = new Set(removedIds);
  const parent = treeParent(state.tree, id);
  const nodes = state.tree.nodes
    .filter((item) => !removed.has(item.id))
    .map((item) => parent && item.id === parent.id
      ? withChild(item, parent.leftChildId === id ? "left" : "right", null)
      : item);
  const tree = { ...state.tree, rootId: id === state.tree.rootId ? null : state.tree.rootId, nodes };
  const view = {
    selectedNodeId: state.view.selectedNodeId && removed.has(state.view.selectedNodeId) ? null : state.view.selectedNodeId,
    highlightedNodeIds: state.view.highlightedNodeIds.filter((item) => !removed.has(item)),
  };
  return commit(state, tree, view, idleExecution(), "NODE_REMOVED", "Removed " + node.value + " and its subtree.", { removedIds }, id);
}

export function updateNode(
  state: TreeRuntimeState,
  input: { id: string; value: number },
): TreeOperationResult<TreeNode> {
  if (state.tree.kind === "heap") return fail("Use Heap operations to change a heap.", state);
  if (state.tree.kind === "avl") return fail("Use AVL Delete and Insert to change a value.", state);
  const node = treeNode(state.tree, input.id);
  if (!node) return fail("Node " + input.id + " does not exist.", state);
  if (!validValue(input.value)) return fail("Node value must be a finite number.", state);
  const replacement = { ...node, value: input.value };
  const tree = replaceNode(state.tree, replacement);
  const error = bstError(tree);
  if (error) return fail(error, state);
  return commit(state, tree, state.view, idleExecution(), "NODE_UPDATED", "Updated " + node.value + " to " + input.value + ".", replacement, node.id);
}

function moveChild(
  state: TreeRuntimeState,
  parentId: string,
  childNodeId: string,
  side: ChildSide,
): TreeOperationResult<TreeNode> {
  if (state.tree.kind === "heap") return fail("Heap branches follow array positions.", state);
  if (state.tree.kind === "avl") return fail("AVL branches are positioned by their values.", state);
  const parent = treeNode(state.tree, parentId);
  const child = treeNode(state.tree, childNodeId);
  if (!parent) return fail("Parent node " + parentId + " does not exist.", state);
  if (!child) return fail("Child node " + childNodeId + " does not exist.", state);
  if (child.id === state.tree.rootId) return fail("The root cannot be moved below another node.", state);
  if (parent.id === child.id || subtreeNodeIds(state.tree, child.id).includes(parent.id)) {
    return fail("Moving this child would create a cycle.", state);
  }
  const occupied = childId(parent, side);
  if (occupied && occupied !== child.id) return fail("The " + side + " side is already occupied.", state);
  if (occupied === child.id) return fail("That child is already on the " + side + ".", state);
  const oldParent = treeParent(state.tree, child.id);
  if (!oldParent) return fail("The child has no valid parent.", state);
  let tree = replaceNode(state.tree, withChild(oldParent, oldParent.leftChildId === child.id ? "left" : "right", null));
  tree = replaceNode(tree, withChild(treeNode(tree, parent.id)!, side, child.id));
  tree = replaceNode(tree, { ...child, parentId: parent.id });
  const error = bstError(tree);
  if (error) return fail(error, state);
  return commit(state, tree, state.view, idleExecution(), "NODE_UPDATED", "Moved " + child.value + " to the " + side + " of " + parent.value + ".", child, child.id);
}

export function setLeftChild(state: TreeRuntimeState, parentId: string, childNodeId: string) {
  return moveChild(state, parentId, childNodeId, "left");
}

export function setRightChild(state: TreeRuntimeState, parentId: string, childNodeId: string) {
  return moveChild(state, parentId, childNodeId, "right");
}

export type TreeInspection = {
  kind: TreeKind;
  nodeCount: number;
  root: TreeNode | null;
  height: number;
  nodes: TreeNode[];
};

export type TreeNodeInspection = {
  node: TreeNode;
  parent: TreeNode | null;
  children: TreeNode[];
  sibling: TreeNode | null;
  depth: number;
  height: number;
  balanceFactor: number;
  leaf: boolean;
  subtree: TreeModel;
};

export function inspectTree(tree: TreeModel): TreeInspection {
  return {
    kind: tree.kind, nodeCount: tree.nodes.length, root: treeNode(tree, tree.rootId),
    height: treeHeight(tree), nodes: tree.nodes,
  };
}

export function inspectNode(tree: TreeModel, id: string): TreeNodeInspection | null {
  const node = treeNode(tree, id);
  const subtree = treeSubtree(tree, id);
  if (!node || !subtree) return null;
  return {
    node, parent: treeParent(tree, id), children: treeChildren(tree, id),
    sibling: treeSibling(tree, id), depth: treeDepth(tree, id),
    height: treeHeight(tree, id), balanceFactor: avlBalanceFactor(tree, id), leaf: !node.leftChildId && !node.rightChildId,
    subtree,
  };
}

export const getParent = treeParent;
export const getChildren = treeChildren;
export function getSiblings(tree: TreeModel, id: string): TreeNode[] {
  const sibling = treeSibling(tree, id);
  return sibling ? [sibling] : [];
}
export const getDepth = treeDepth;
export const getHeight = treeHeight;
export const getSubtree = treeSubtree;

export function selectTreeNode(state: TreeRuntimeState, id: string | null): TreeOperationResult<TreeViewState> {
  if (id && !treeNode(state.tree, id)) return fail("Node " + id + " does not exist.", state);
  const view = { ...state.view, selectedNodeId: id };
  return commit(state, state.tree, view, state.execution, "NODE_SELECTED", id ? "Selected node " + id + "." : "Selection cleared.", view, id ?? undefined);
}

export function highlightTreeNodes(state: TreeRuntimeState, ids: string[]): TreeOperationResult<TreeViewState> {
  const missing = ids.find((id) => !treeNode(state.tree, id));
  if (missing) return fail("Node " + missing + " does not exist.", state);
  const view = { ...state.view, highlightedNodeIds: [...new Set(ids)] };
  return commit(state, state.tree, view, state.execution, "TREE_VISUAL_CLEARED", "Tree highlights updated.", view);
}

export function clearTreeVisualState(state: TreeRuntimeState): TreeOperationResult<TreeViewState> {
  const view = { selectedNodeId: null, highlightedNodeIds: [] };
  return commit(state, state.tree, view, idleExecution(), "TREE_VISUAL_CLEARED", "Tree visual state cleared.", view);
}

export function queueTreePlan(state: TreeRuntimeState, plan: TreePlan): TreeOperationResult<TreePlanResult> {
  if (!plan.steps.length) return fail(plan.result.summary, state);
  const step = plan.steps[0];
  const tree = step.treeAfter ?? state.tree;
  const execution: TreeExecutionState = {
    status: plan.steps.length === 1 ? "complete" : "running",
    operation: plan.operation,
    currentStep: 1, totalSteps: plan.steps.length, steps: plan.steps, step,
    result: plan.result,
  };
  return commit(state, tree, state.view, execution, "EXECUTION_STARTED", step.description, plan.result, step.currentNodeId);
}

export function stepTreeExecution(state: TreeRuntimeState, auto = false): TreeOperationResult<TreeExecutionState> {
  const current = state.execution;
  if (!current.steps.length) return fail("Choose a traversal or BST operation first.", state);
  if (current.currentStep >= current.totalSteps) return fail("Execution is already complete.", state);
  const step = current.steps[current.currentStep];
  const execution: TreeExecutionState = {
    ...current,
    status: current.currentStep + 1 === current.totalSteps ? "complete" : auto && current.status === "running" ? "running" : "paused",
    currentStep: current.currentStep + 1,
    step,
  };
  const tree = step.treeAfter ?? state.tree;
  const view = step.treeAfter
    ? {
        selectedNodeId: state.view.selectedNodeId && treeNode(tree, state.view.selectedNodeId) ? state.view.selectedNodeId : null,
        highlightedNodeIds: state.view.highlightedNodeIds.filter((id) => treeNode(tree, id)),
      }
    : state.view;
  return commit(state, tree, view, execution, step.eventType ?? "EXECUTION_STEP", step.description, execution, step.eventNodeId ?? step.currentNodeId);
}

export function startTreeExecution(state: TreeRuntimeState): TreeOperationResult<TreeExecutionState> {
  if (!state.execution.steps.length) return fail("Choose a traversal or BST operation first.", state);
  if (state.execution.status === "complete") return fail("This demonstration is complete. Choose it again to replay.", state);
  const execution: TreeExecutionState = { ...state.execution, status: "running" };
  return commit(state, state.tree, state.view, execution, "EXECUTION_STARTED", "Playback started.", execution);
}

export function pauseTreeExecution(state: TreeRuntimeState): TreeOperationResult<TreeExecutionState> {
  if (state.execution.status !== "running") return fail("Playback is not running.", state);
  const execution: TreeExecutionState = { ...state.execution, status: "paused" };
  return commit(state, state.tree, state.view, execution, "EXECUTION_PAUSED", "Playback paused.", execution);
}

export function resetTreeExecution(state: TreeRuntimeState): TreeOperationResult<TreeExecutionState> {
  const execution = idleExecution();
  return commit(state, state.tree, state.view, execution, "EXECUTION_RESET", "Playback reset.", execution);
}
