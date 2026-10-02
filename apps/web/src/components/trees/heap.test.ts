import { describe, expect, test } from "bun:test";
import {
  buildHeapExtract,
  buildHeapFromValues,
  buildHeapInsert,
  buildHeapValidation,
  buildPriorityDequeue,
  buildPriorityEnqueue,
  createTree,
  heapOf,
  priorityPeek,
  queueTreePlan,
  stepTreeExecution,
  treeNode,
  validateHeap,
} from "@/components/trees";
import type { TreePlan, TreeRuntimeState } from "@/components/trees";

function finish(state: TreeRuntimeState, plan: TreePlan) {
  expect(plan.steps.length).toBeGreaterThan(0);
  state = queueTreePlan(state, plan).state!;
  while (state.execution.status !== "complete") state = stepTreeExecution(state, true).state!;
  return state;
}

function heap(type: "min" | "max", values: number[]) {
  return finish(createTree("heap").state!, buildHeapFromValues(values, type));
}

describe("Heap phase 5", () => {
  test("min and max heap building keeps the array and rendered tree synchronized", () => {
    const min = heap("min", [40, 10, 30, 20, 50]);
    expect(heapOf(min.tree)?.entries.map((entry) => entry.value)).toEqual([10, 20, 30, 40, 50]);
    expect(min.tree.nodes.map((node) => node.id)).toEqual(heapOf(min.tree)?.entries.map((entry) => entry.id));
    expect(treeNode(min.tree, min.tree.rootId)?.value).toBe(10);
    expect(validateHeap(min.tree)?.valid).toBe(true);

    const max = heap("max", [40, 10, 30, 20, 50]);
    expect(heapOf(max.tree)?.entries.map((entry) => entry.value)).toEqual([50, 40, 30, 20, 10]);
    expect(treeNode(max.tree, max.tree.rootId)?.value).toBe(50);
    expect(validateHeap(max.tree)?.valid).toBe(true);
  });

  test("insert makes comparisons and animated snapshots before settling a min heap", () => {
    const initial = heap("min", [10, 20, 30]);
    const plan = buildHeapInsert(initial.tree, 5);
    expect(plan.steps.some((step) => step.type === "compare")).toBe(true);
    expect(plan.steps.filter((step) => step.type === "swap_nodes")).toHaveLength(2);
    expect(heapOf(initial.tree)?.entries.map((entry) => entry.value)).toEqual([10, 20, 30]);
    let state = queueTreePlan(initial, plan).state!;
    expect(state.execution.step?.type).toBe("insert_node");
    expect(heapOf(state.tree)?.entries.map((entry) => entry.value)).toEqual([10, 20, 30, 5]);
    while (state.execution.status !== "complete") state = stepTreeExecution(state, true).state!;
    expect(heapOf(state.tree)?.entries.map((entry) => entry.value)).toEqual([5, 10, 30, 20]);
    expect(validateHeap(state.tree)?.valid).toBe(true);
  });

  test("extract animates root replacement then heapify down", () => {
    const initial = heap("min", [5, 10, 20, 30, 40]);
    const plan = buildHeapExtract(initial.tree);
    expect(plan.result.extracted?.value).toBe(5);
    expect(plan.steps.some((step) => step.type === "extract_root")).toBe(true);
    expect(plan.steps.some((step) => step.type === "delete_node")).toBe(true);
    const final = finish(initial, plan);
    expect(heapOf(final.tree)?.entries.map((entry) => entry.value)).toEqual([10, 30, 20, 40]);
    expect(validateHeap(final.tree)?.valid).toBe(true);
  });

  test("validation returns structured violations", () => {
    const tree = heap("min", [10, 20, 30]);
    const invalid = {
      ...tree.tree,
      heap: { type: "min" as const, entries: [
        { id: "h1", value: 30 }, { id: "h2", value: 10 }, { id: "h3", value: 20 },
      ] },
      rootId: "h1",
      nodes: [
        { id: "h1", value: 30, parentId: null, leftChildId: "h2", rightChildId: "h3" },
        { id: "h2", value: 10, parentId: "h1", leftChildId: null, rightChildId: null },
        { id: "h3", value: 20, parentId: "h1", leftChildId: null, rightChildId: null },
      ],
    };
    const validation = validateHeap(invalid)!;
    expect(validation.valid).toBe(false);
    expect(validation.violatingNodes).toEqual(["h1", "h2", "h3"]);
    expect(validation.violatingEdges).toHaveLength(2);
    expect(buildHeapValidation(invalid).result.valid).toBe(false);
  });

  test("priority queue uses the heap engine and returns best priority first", () => {
    let state = heap("min", []);
    state = finish(state, buildPriorityEnqueue(state.tree, 3, "A"));
    state = finish(state, buildPriorityEnqueue(state.tree, 1, "B"));
    state = finish(state, buildPriorityEnqueue(state.tree, 2, "C"));
    expect(priorityPeek(state.tree)?.label).toBe("B");
    const first = buildPriorityDequeue(state.tree);
    expect(first.result.extracted?.label).toBe("B");
    state = finish(state, first);
    expect(priorityPeek(state.tree)?.label).toBe("C");
    state = finish(state, buildPriorityDequeue(state.tree));
    state = finish(state, buildPriorityDequeue(state.tree));
    expect(priorityPeek(state.tree)).toBe(null);
  });

  test("heap operations reject invalid modes and values without mutating", () => {
    const bst = createTree("bst").state!;
    expect(buildHeapInsert(bst.tree, 5).steps).toHaveLength(0);
    const min = heap("min", [10]);
    expect(buildHeapInsert(min.tree, Number.NaN).steps).toHaveLength(0);
    expect(buildHeapExtract(heap("min", []).tree).steps).toHaveLength(0);
  });
});
