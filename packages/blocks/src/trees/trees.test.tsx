import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  TreeRenderer,
  addNode,
  bstViolations,
  buildBstDelete,
  buildBstInsert,
  buildBstSearch,
  buildBstValidation,
  buildTraversal,
  createRoot,
  createTree,
  createTreeState,
  emptyTree,
  getChildren,
  getDepth,
  getHeight,
  getParent,
  getSiblings,
  getSubtree,
  inspectNode,
  layoutBinaryTree,
  pauseTreeExecution,
  queueTreePlan,
  removeNode,
  resetTreeExecution,
  selectTreeNode,
  setLeftChild,
  setRightChild,
  startTreeExecution,
  stepTreeExecution,
  structureErrors,
  treeNode,
  updateNode,
} from "./index";
import type { TreeModel, TreePlan, TreeRuntimeState } from "./index";

function example(kind: "binary" | "bst" = "bst"): TreeRuntimeState {
  let state = createTree(kind).state!;
  state = createRoot(state, { value: 50 }).state!;
  state = addNode(state, { value: 30, parentId: "n1", side: "left" }).state!;
  state = addNode(state, { value: 70, parentId: "n1", side: "right" }).state!;
  state = addNode(state, { value: 20, parentId: "n2", side: "left" }).state!;
  state = addNode(state, { value: 40, parentId: "n2", side: "right" }).state!;
  state = addNode(state, { value: 60, parentId: "n3", side: "left" }).state!;
  state = addNode(state, { value: 80, parentId: "n3", side: "right" }).state!;
  return state;
}

function finish(state: TreeRuntimeState, treePlan: TreePlan) {
  state = queueTreePlan(state, treePlan).state!;
  while (state.execution.status !== "complete") {
    state = stepTreeExecution(state, true).state!;
  }
  return state;
}

describe("Tree phases 1–3", () => {
  test("binary-tree operations preserve root, parent/child links, and subtree rules", () => {
    let state = example("binary");
    expect(structureErrors(state.tree)).toEqual([]);
    expect(getParent(state.tree, "n4")?.id).toBe("n2");
    expect(getChildren(state.tree, "n2").map((node) => node.value)).toEqual([20, 40]);
    expect(getSiblings(state.tree, "n4").map((node) => node.value)).toEqual([40]);
    expect(getDepth(state.tree, "n4")).toBe(2);
    expect(getHeight(state.tree)).toBe(2);
    expect(getSubtree(state.tree, "n2")?.nodes).toHaveLength(3);
    expect(inspectNode(state.tree, "n4")?.leaf).toBe(true);
    expect(addNode(state, { value: 99, parentId: "n2", side: "left" }).ok).toBe(false);
    expect(setRightChild(state, "n4", "n2").ok).toBe(false);
    state = removeNode(state, "n2").state!;
    expect(state.tree.nodes.map((node) => node.value)).toEqual([50, 70, 60, 80]);
    expect(treeNode(state.tree, "n1")?.leftChildId).toBe(null);
    expect(structureErrors(state.tree)).toEqual([]);
    state = updateNode(state, { id: "n3", value: 75 }).state!;
    expect(treeNode(state.tree, "n3")?.value).toBe(75);
  });

  test("moving a branch and removing the root keep one connected tree", () => {
    let state = example("binary");
    state = setRightChild(state, "n5", "n4").state!;
    expect(treeNode(state.tree, "n2")?.leftChildId).toBe(null);
    expect(treeNode(state.tree, "n5")?.rightChildId).toBe("n4");
    expect(treeNode(state.tree, "n4")?.parentId).toBe("n5");
    expect(structureErrors(state.tree)).toEqual([]);
    state = setLeftChild(state, "n4", "n7").state!;
    expect(treeNode(state.tree, "n4")?.leftChildId).toBe("n7");
    expect(structureErrors(state.tree)).toEqual([]);
    state = removeNode(state, "n1").state!;
    expect(state.tree.rootId).toBe(null);
    expect(state.tree.nodes).toHaveLength(0);
  });

  test("a paused successor replacement never mutates the BST early", () => {
    const initial = example();
    let state = queueTreePlan(initial, buildBstDelete(initial.tree, 50)).state!;
    while (state.execution.step?.type !== "replace_value") {
      state = stepTreeExecution(state, true).state!;
    }
    expect(state.tree).toBe(initial.tree);
    expect(treeNode(state.tree, "n1")?.value).toBe(50);
    expect(state.execution.step?.displayValues?.n1).toBe(60);
    expect(bstViolations(state.tree)).toEqual([]);
    state = resetTreeExecution(state).state!;
    expect(treeNode(state.tree, "n1")?.value).toBe(50);
  });

  test("manual add chooses the first binary slot or the correct BST branch", () => {
    let binary = createTree("binary").state!;
    binary = createRoot(binary, { value: 50 }).state!;
    binary = addNode(binary, { value: 30 }).state!;
    binary = addNode(binary, { value: 70 }).state!;
    expect(treeNode(binary.tree, "n1")?.leftChildId).toBe("n2");
    expect(treeNode(binary.tree, "n1")?.rightChildId).toBe("n3");
    let bst = example();
    bst = addNode(bst, { value: 25 }).state!;
    expect(treeNode(bst.tree, "n4")?.rightChildId).toBe("n8");
    expect(bstViolations(bst.tree)).toEqual([]);
    expect(addNode(bst, { value: 25 }).ok).toBe(false);
    expect(updateNode(bst, { id: "n4", value: 90 }).ok).toBe(false);
  });

  test("layout keeps lone right children to the right and balanced branches apart", () => {
    let state = createTreeState(emptyTree());
    state = createRoot(state, { value: 10 }).state!;
    state = addNode(state, { value: 20, parentId: "n1", side: "right" }).state!;
    state = addNode(state, { value: 30, parentId: "n2", side: "right" }).state!;
    const layout = layoutBinaryTree(state.tree);
    expect(layout.positions.get("n1")!.x < layout.positions.get("n2")!.x).toBe(true);
    expect(layout.positions.get("n2")!.x < layout.positions.get("n3")!.x).toBe(true);
    expect(layout.positions.get("n1")!.y < layout.positions.get("n2")!.y).toBe(true);
    const balanced = layoutBinaryTree(example().tree);
    expect(balanced.positions.get("n2")!.x < balanced.positions.get("n1")!.x).toBe(true);
    expect(balanced.positions.get("n1")!.x < balanced.positions.get("n3")!.x).toBe(true);
  });

  test("all four traversals expose correct progressive visit order", () => {
    const tree = example().tree;
    const cases: Array<[Parameters<typeof buildTraversal>[1], number[]]> = [
      ["preorder", [50, 30, 20, 40, 70, 60, 80]],
      ["inorder", [20, 30, 40, 50, 60, 70, 80]],
      ["postorder", [20, 40, 30, 60, 80, 70, 50]],
      ["levelOrder", [50, 30, 70, 20, 40, 60, 80]],
    ];
    for (const [kind, expected] of cases) {
      const treePlan = buildTraversal(tree, kind);
      expect(treePlan.result.order).toEqual(expected.map(String));
      expect(treePlan.steps.filter((step) => step.type === "visit_node").map((step) => step.output?.at(-1))).toEqual(expected.map(String));
      expect(treePlan.steps.at(-1)?.type).toBe("complete");
      expect(typeof JSON.stringify(treePlan.steps)).toBe("string");
    }
    expect(buildTraversal(tree, "levelOrder").steps.some((step) => step.queue?.length)).toBe(true);
  });

  test("BST insertion can create the first root, and deletion reconnects a one-child root", () => {
    let state = createTree("bst").state!;
    state = finish(state, buildBstInsert(state.tree, 50));
    expect(treeNode(state.tree, state.tree.rootId)?.value).toBe(50);
    state = addNode(state, { value: 70 }).state!;
    state = finish(state, buildBstDelete(state.tree, 50));
    expect(treeNode(state.tree, state.tree.rootId)?.value).toBe(70);
    expect(treeNode(state.tree, state.tree.rootId)?.parentId).toBe(null);
    expect(structureErrors(state.tree)).toEqual([]);
  });

  test("BST insert and search animate before changing the model", () => {
    const initial = example();
    const insert = buildBstInsert(initial.tree, 25);
    let state = queueTreePlan(initial, insert).state!;
    expect(state.tree.nodes).toHaveLength(7);
    expect(state.execution.status).toBe("running");
    state = pauseTreeExecution(state).state!;
    expect(state.execution.status).toBe("paused");
    state = startTreeExecution(state).state!;
    while (state.execution.status !== "complete") state = stepTreeExecution(state, true).state!;
    expect(treeNode(state.tree, insert.result.insertedNodeId)?.value).toBe(25);
    expect(bstViolations(state.tree)).toEqual([]);
    expect(structureErrors(state.tree)).toEqual([]);
    const search = buildBstSearch(state.tree, 25);
    expect(search.result.foundNodeId).toBe(insert.result.insertedNodeId);
    expect(search.steps.some((step) => step.type === "compare")).toBe(true);
    expect(buildBstSearch(state.tree, 99).result.success).toBe(false);
    expect(buildBstInsert(state.tree, 25).result.success).toBe(false);
    state = resetTreeExecution(state).state!;
    expect(state.tree.nodes).toHaveLength(8);
    expect(state.execution.status).toBe("idle");
  });

  test("BST deletion handles leaf, one child, and two children", () => {
    const leaf = finish(example(), buildBstDelete(example().tree, 20));
    expect(leaf.tree.nodes).toHaveLength(6);
    expect(treeNode(leaf.tree, "n4")).toBe(null);
    expect(structureErrors(leaf.tree)).toEqual([]);
    expect(bstViolations(leaf.tree)).toEqual([]);

    let one = example();
    one = removeNode(one, "n4").state!;
    const onePlan = buildBstDelete(one.tree, 30);
    one = finish(one, onePlan);
    expect(treeNode(one.tree, "n1")?.leftChildId).toBe("n5");
    expect(treeNode(one.tree, "n5")?.parentId).toBe("n1");
    expect(structureErrors(one.tree)).toEqual([]);
    expect(bstViolations(one.tree)).toEqual([]);

    let two = example();
    two = selectTreeNode(two, "n6").state!;
    const twoPlan = buildBstDelete(two.tree, 50);
    expect(twoPlan.steps.some((step) => step.type === "replace_value")).toBe(true);
    expect(twoPlan.steps.some((step) => step.type === "mark_deleting")).toBe(true);
    two = finish(two, twoPlan);
    expect(two.tree.nodes).toHaveLength(6);
    expect(treeNode(two.tree, "n1")?.value).toBe(60);
    expect(treeNode(two.tree, "n6")).toBe(null);
    expect(two.view.selectedNodeId).toBe(null);
    expect(structureErrors(two.tree)).toEqual([]);
    expect(bstViolations(two.tree)).toEqual([]);
  });

  test("BST successor with a right child is reconnected", () => {
    let state = example();
    state = addNode(state, { value: 65, parentId: "n6", side: "right" }).state!;
    state = finish(state, buildBstDelete(state.tree, 50));
    expect(treeNode(state.tree, "n3")?.leftChildId).toBe("n8");
    expect(treeNode(state.tree, "n8")?.parentId).toBe("n3");
    expect(structureErrors(state.tree)).toEqual([]);
    expect(bstViolations(state.tree)).toEqual([]);
  });

  test("validation reports deep range violations, not only child comparisons", () => {
    const valid = buildBstValidation(example().tree);
    expect(valid.result.valid).toBe(true);
    const binary = example("binary").tree;
    const invalid: TreeModel = {
      ...binary,
      nodes: binary.nodes.map((node) => node.id === "n5" ? { ...node, value: 55 } : node),
    };
    const checked = buildBstValidation(invalid);
    expect(checked.result.valid).toBe(false);
    expect(checked.result.violations?.map((violation) => violation.nodeId)).toEqual(["n5"]);
    expect(checked.steps.some((step) => step.type === "violation")).toBe(true);
  });

  test("a completed successful search keeps its found node emphasized", () => {
    const initial = example();
    const state = finish(initial, buildBstSearch(initial.tree, 40));
    const html = renderToStaticMarkup(
      <TreeRenderer tree={state.tree} view={state.view} execution={state.execution} onSelect={() => {}} />,
    );
    expect(html.includes('data-tree-state="found"')).toBe(true);
  });

  test("selection, renderer, and step visuals use the same tree model", () => {
    let state = example();
    state = selectTreeNode(state, "n2").state!;
    expect(state.view.selectedNodeId).toBe("n2");
    const sameTree = state.tree;
    state = queueTreePlan(state, buildTraversal(state.tree, "preorder")).state!;
    const html = renderToStaticMarkup(
      <TreeRenderer tree={state.tree} view={state.view} execution={state.execution} onSelect={() => {}} />,
    );
    expect(html.includes("Binary tree diagram")).toBe(true);
    expect(html.includes('data-tree-node="n1"')).toBe(true);
    expect(html.includes('data-tree-side="left"')).toBe(true);
    expect(state.tree).toBe(sameTree);
  });
});
