import { describe, expect, test } from "bun:test";
import {
  avlBalanceFactors,
  buildAvlDelete,
  buildAvlInsert,
  buildAvlValidation,
  createTree,
  queueTreePlan,
  pauseTreeExecution,
  startTreeExecution,
  resetTreeExecution,
  rotateLeft,
  rotateRight,
  stepTreeExecution,
  structureErrors,
  treeNode,
} from "@/components/trees";
import type { TreePlan, TreeRuntimeState } from "@/components/trees";

function finish(state: TreeRuntimeState, plan: TreePlan): TreeRuntimeState {
  expect(plan.steps.length).toBeGreaterThan(0);
  state = queueTreePlan(state, plan).state!;
  while (state.execution.status !== "complete") {
    state = stepTreeExecution(state, true).state!;
  }
  return state;
}

function avl(values: number[]): TreeRuntimeState {
  let state = createTree("avl").state!;
  for (const value of values) state = finish(state, buildAvlInsert(state.tree, value));
  return state;
}

function balanced(state: TreeRuntimeState) {
  expect(structureErrors(state.tree)).toEqual([]);
  expect(buildAvlValidation(state.tree).result.valid).toBe(true);
  expect(Object.values(avlBalanceFactors(state.tree)).every((factor) => Math.abs(factor) <= 1)).toBe(true);
}

describe("AVL phase 4", () => {
  const cases = [
    { name: "LL", first: [30, 20], last: 10, steps: ["rotate_right"] },
    { name: "RR", first: [10, 20], last: 30, steps: ["rotate_left"] },
    { name: "LR", first: [30, 10], last: 20, steps: ["rotate_left", "rotate_right"] },
    { name: "RL", first: [10, 30], last: 20, steps: ["rotate_right", "rotate_left"] },
  ] as const;

  for (const item of cases) {
    test(item.name + " insertion animates each rotation and preserves links", () => {
      const initial = avl([...item.first]);
      const plan = buildAvlInsert(initial.tree, item.last);
      expect(plan.result.rotationCases).toEqual([item.name]);
      expect(plan.steps.filter((step) => step.type.startsWith("rotate_")).map((step) => step.type)).toEqual([...item.steps]);
      expect(plan.steps.some((step) => step.type === "detect_imbalance")).toBe(true);
      expect(plan.steps.some((step) => step.type === "calculate_balance")).toBe(true);
      for (const step of plan.steps) if (step.treeAfter) expect(structureErrors(step.treeAfter)).toEqual([]);
      let state = queueTreePlan(initial, plan).state!;
      expect(state.tree).toBe(initial.tree);
      while (state.execution.step?.type !== "insert_node") state = stepTreeExecution(state, true).state!;
      expect(treeNode(state.tree, state.tree.rootId)?.value).toBe(item.first[0]);
      while (state.execution.status !== "complete") state = stepTreeExecution(state, true).state!;
      expect(treeNode(state.tree, state.tree.rootId)?.value).toBe(20);
      balanced(state);
    });
  }

  test("validation reports BST and balance violations with factors", () => {
    const good = avl([30, 20, 40]);
    expect(buildAvlValidation(good.tree).result.valid).toBe(true);
    const skewed = {
      ...good.tree,
      nodes: [
        { id: "n1", value: 30, parentId: null, leftChildId: "n2", rightChildId: null },
        { id: "n2", value: 20, parentId: "n1", leftChildId: "n3", rightChildId: null },
        { id: "n3", value: 10, parentId: "n2", leftChildId: null, rightChildId: null },
      ],
    };
    const invalid = buildAvlValidation(skewed);
    expect(invalid.result.valid).toBe(false);
    expect(invalid.result.balanceFactors?.n1).toBe(2);
    expect(invalid.result.violations?.some((item) => item.nodeId === "n1")).toBe(true);
    const badBst = { ...good.tree, nodes: good.tree.nodes.map((node) => node.value === 20 ? { ...node, value: 50 } : node) };
    expect(buildAvlValidation(badBst).result.valid).toBe(false);
    expect(buildAvlInsert(skewed, 5).steps).toHaveLength(0);
  });

  test("AVL deletion supports leaf, one child, and two children", () => {
    const full = avl([30, 20, 40, 10, 25, 35, 50]);
    const leaf = finish(full, buildAvlDelete(full.tree, 10));
    expect(leaf.tree.nodes.some((node) => node.value === 10)).toBe(false);
    balanced(leaf);
    const onePlan = buildAvlDelete(leaf.tree, 20);
    expect(onePlan.steps.some((step) => step.type === "delete_node")).toBe(true);
    const one = finish(leaf, onePlan);
    expect(treeNode(one.tree, one.tree.rootId)?.leftChildId).toBe(treeNode(one.tree, "n5")?.id);
    balanced(one);
    const twoPlan = buildAvlDelete(full.tree, 30);
    expect(twoPlan.steps.some((step) => step.type === "replace_value")).toBe(true);
    const two = finish(full, twoPlan);
    expect(two.tree.nodes.some((node) => node.value === 30)).toBe(false);
    balanced(two);
  });

  test("AVL deletion rebalances after removing a branch", () => {
    const initial = avl([9, 5, 10, 0, 6, 11, -1, 1, 2]);
    const plan = buildAvlDelete(initial.tree, 10);
    expect(plan.result.rotationCases?.length).toBeGreaterThan(0);
    const final = finish(initial, plan);
    balanced(final);
  });

  test("invalid actions do not mutate the AVL model", () => {
    const initial = avl([20, 10, 30]);
    expect(buildAvlInsert(initial.tree, 10).result.success).toBe(false);
    expect(buildAvlDelete(initial.tree, 99).result.success).toBe(false);
    expect(buildAvlInsert(initial.tree, Number.NaN).steps).toHaveLength(0);
    expect(buildAvlInsert({ ...initial.tree, kind: "bst" }, 40).steps).toHaveLength(0);
    expect(rotateLeft(initial.tree, initial.tree.rootId!).rootId).toBe("n3");
    expect(rotateRight(initial.tree, initial.tree.rootId!).rootId).toBe("n2");
  });
  test("mixed inserts and deletes remain valid after repeated rebalancing", () => {
    const values = [42, 17, 68, 9, 24, 51, 83, 4, 12, 21, 29, 47, 57, 75, 91];
    let state = avl(values);
    balanced(state);
    for (const value of [17, 68, 42, 9, 83, 4, 91, 24, 51, 12, 21, 29, 47, 57, 75]) {
      state = finish(state, buildAvlDelete(state.tree, value));
      balanced(state);
    }
    expect(state.tree.rootId).toBe(null);
    expect(state.tree.nodes).toHaveLength(0);
  });
  test("AVL playback can pause, step, resume, and reset", () => {
    const initial = avl([30, 20]);
    let state = queueTreePlan(initial, buildAvlInsert(initial.tree, 10)).state!;
    expect(state.execution.status).toBe("running");
    state = pauseTreeExecution(state).state!;
    expect(state.execution.status).toBe("paused");
    state = stepTreeExecution(state).state!;
    expect(state.execution.status).toBe("paused");
    state = startTreeExecution(state).state!;
    expect(state.execution.status).toBe("running");
    while (state.execution.status !== "complete") state = stepTreeExecution(state, true).state!;
    balanced(state);
    state = resetTreeExecution(state).state!;
    expect(state.execution.status).toBe("idle");
    expect(treeNode(state.tree, state.tree.rootId)?.value).toBe(20);
  });
});
