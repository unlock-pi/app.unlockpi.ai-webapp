import type {
  HeapEntry,
  HeapModel,
  HeapType,
  TreeModel,
  TreeNode,
  TreePlan,
  TreeStep,
} from "./types";

type StepInput = Omit<TreeStep, "index">;

function writer() {
  const steps: TreeStep[] = [];
  return {
    steps,
    add(input: StepInput) { steps.push({ ...input, index: steps.length + 1 }); },
  };
}

function failure(operation: string, summary: string): TreePlan {
  return { operation, steps: [], result: { success: false, summary } };
}

function heapId(entries: HeapEntry[]) {
  let index = 1;
  while (entries.some((entry) => entry.id === "h" + index)) index++;
  return "h" + index;
}

function nodeFromEntry(entry: HeapEntry, index: number, entries: HeapEntry[]): TreeNode {
  return {
    id: entry.id,
    value: entry.value,
    parentId: index ? entries[Math.floor((index - 1) / 2)]?.id ?? null : null,
    leftChildId: entries[index * 2 + 1]?.id ?? null,
    rightChildId: entries[index * 2 + 2]?.id ?? null,
  };
}

/** Derives the complete binary Tree view from the one Heap array source of truth. */
export function heapTree(entries: HeapEntry[], type: HeapType): TreeModel {
  const copy = entries.map((entry) => ({ ...entry }));
  return {
    kind: "heap",
    rootId: copy[0]?.id ?? null,
    nodes: copy.map((entry, index) => nodeFromEntry(entry, index, copy)),
    heap: { type, entries: copy },
  };
}

export function emptyHeap(type: HeapType = "min"): TreeModel {
  return heapTree([], type);
}

export function heapOf(tree: TreeModel): HeapModel | null {
  return tree.kind === "heap" && tree.heap ? tree.heap : null;
}

export function heapParentIndex(index: number) {
  return index > 0 ? Math.floor((index - 1) / 2) : null;
}
export function heapLeftIndex(index: number) { return index * 2 + 1; }
export function heapRightIndex(index: number) { return index * 2 + 2; }

function before(a: HeapEntry, b: HeapEntry, type: HeapType) {
  return type === "min" ? a.value < b.value : a.value > b.value;
}

function validHeap(tree: TreeModel) {
  const heap = heapOf(tree);
  if (!heap) return "Switch to Heap mode first.";
  return null;
}

function snapshot(entries: HeapEntry[], type: HeapType) {
  return heapTree(entries, type);
}

function compareStep(out: ReturnType<typeof writer>, entries: HeapEntry[], type: HeapType, current: number, other: number, description: string) {
  out.add({
    type: "compare", description,
    currentNodeId: entries[current]?.id,
    highlightedNodeIds: [entries[current]?.id, entries[other]?.id].filter((id): id is string => Boolean(id)),
    heapIndices: { current, parent: heapParentIndex(current) ?? undefined, left: heapLeftIndex(current), right: heapRightIndex(current) },
    heapArray: entries,
  });
}

function siftUp(out: ReturnType<typeof writer>, input: HeapEntry[], type: HeapType): HeapEntry[] {
  const entries = [...input];
  let index = entries.length - 1;
  while (index > 0) {
    const parent = heapParentIndex(index)!;
    compareStep(out, entries, type, index, parent, "Compare " + entries[index].value + " with parent " + entries[parent].value + ".");
    if (!before(entries[index], entries[parent], type)) {
      out.add({ type: "heapify_up", description: entries[index].value + " is in the right place.", currentNodeId: entries[index].id, heapIndices: { current: index, parent }, heapArray: entries });
      break;
    }
    [entries[index], entries[parent]] = [entries[parent], entries[index]];
    out.add({
      type: "swap_nodes", description: "Swap " + entries[index].value + " and " + entries[parent].value + ".",
      currentNodeId: entries[parent].id, highlightedNodeIds: [entries[index].id, entries[parent].id],
      heapIndices: { current: parent, parent: heapParentIndex(parent) ?? undefined },
      heapArray: entries, treeAfter: snapshot(entries, type),
    });
    index = parent;
  }
  return entries;
}

function siftDown(out: ReturnType<typeof writer>, input: HeapEntry[], type: HeapType, start = 0): HeapEntry[] {
  const entries = [...input];
  let index = start;
  while (true) {
    const left = heapLeftIndex(index);
    const right = heapRightIndex(index);
    if (left >= entries.length) {
      out.add({ type: "heapify_down", description: entries[index].value + " has no children to compare.", currentNodeId: entries[index].id, heapIndices: { current: index, left, right }, heapArray: entries });
      break;
    }
    let chosen = left;
    if (right < entries.length) {
      compareStep(out, entries, type, left, right, "Choose the " + (type === "min" ? "smaller" : "larger") + " child: " + entries[left].value + " or " + entries[right].value + ".");
      if (before(entries[right], entries[left], type)) chosen = right;
    }
    compareStep(out, entries, type, index, chosen, "Compare " + entries[index].value + " with child " + entries[chosen].value + ".");
    if (!before(entries[chosen], entries[index], type)) {
      out.add({ type: "heapify_down", description: entries[index].value + " is in the right place.", currentNodeId: entries[index].id, heapIndices: { current: index, left, right }, heapArray: entries });
      break;
    }
    [entries[index], entries[chosen]] = [entries[chosen], entries[index]];
    out.add({
      type: "swap_nodes", description: "Swap " + entries[index].value + " and " + entries[chosen].value + ".",
      currentNodeId: entries[chosen].id, highlightedNodeIds: [entries[index].id, entries[chosen].id],
      heapIndices: { current: chosen, parent: index, left: heapLeftIndex(chosen), right: heapRightIndex(chosen) },
      heapArray: entries, treeAfter: snapshot(entries, type),
    });
    index = chosen;
  }
  return entries;
}

export function buildHeapInsert(tree: TreeModel, value: number, label?: string): TreePlan {
  const error = validHeap(tree);
  if (error) return failure("heap_insert", error);
  if (!Number.isFinite(value)) return failure("heap_insert", "Enter a finite priority.");
  const heap = heapOf(tree)!;
  const out = writer();
  const entry: HeapEntry = { id: heapId(heap.entries), value, label: label?.trim() || undefined };
  const entries = [...heap.entries, entry];
  out.add({
    type: "insert_node", description: "Place " + (entry.label ? entry.label + " with priority " : "") + value + " at the next open spot.",
    currentNodeId: entry.id, highlightedNodeIds: [entry.id], heapIndices: { current: entries.length - 1, parent: heapParentIndex(entries.length - 1) ?? undefined },
    heapArray: entries, treeAfter: snapshot(entries, heap.type), eventType: "NODE_CREATED", eventNodeId: entry.id,
  });
  const finalEntries = siftUp(out, entries, heap.type);
  out.add({ type: "heap_complete", description: "Heap insertion complete.", highlightedNodeIds: [entry.id], heapArray: finalEntries, success: true });
  return {
    operation: "heap_insert", steps: out.steps,
    result: { success: true, summary: "Inserted " + value + ".", insertedNodeId: entry.id, heapType: heap.type, priorityQueue: finalEntries },
  };
}

export function buildHeapExtract(tree: TreeModel): TreePlan {
  const error = validHeap(tree);
  if (error) return failure("heap_extract", error);
  const heap = heapOf(tree)!;
  if (!heap.entries.length) return failure("heap_extract", "The heap is empty.");
  const out = writer();
  const extracted = heap.entries[0];
  out.add({ type: "extract_root", description: "Remove " + extracted.value + " from the root.", currentNodeId: extracted.id, highlightedNodeIds: [extracted.id], heapIndices: { current: 0 }, heapArray: heap.entries });
  if (heap.entries.length === 1) {
    out.add({ type: "delete_node", description: "The heap is now empty.", heapArray: [], treeAfter: emptyHeap(heap.type), eventType: "NODE_REMOVED", eventNodeId: extracted.id });
  } else {
    const entries = [...heap.entries];
    const last = entries.pop()!;
    entries[0] = last;
    out.add({
      type: "delete_node", description: "Move the last value, " + last.value + ", to the root.",
      currentNodeId: last.id, highlightedNodeIds: [last.id], heapIndices: { current: 0, left: 1, right: 2 },
      heapArray: entries, treeAfter: snapshot(entries, heap.type), eventType: "NODE_REMOVED", eventNodeId: extracted.id,
    });
    const finalEntries = siftDown(out, entries, heap.type);
    out.add({ type: "heap_complete", description: "Heap extraction complete.", heapArray: finalEntries, success: true });
  }
  return { operation: "heap_extract", steps: out.steps, result: { success: true, summary: "Extracted " + extracted.value + ".", extracted, heapType: heap.type } };
}

export function buildHeapify(tree: TreeModel, direction: "up" | "down" = "down"): TreePlan {
  const error = validHeap(tree);
  if (error) return failure("heapify", error);
  const heap = heapOf(tree)!;
  if (!heap.entries.length) return failure("heapify", "Add a value before heapifying.");
  const out = writer();
  let entries = [...heap.entries];
  out.add({ type: "start", description: "Restore the " + heap.type + " heap property.", heapArray: entries });
  if (direction === "up") entries = siftUp(out, entries, heap.type);
  else entries = siftDown(out, entries, heap.type);
  out.add({ type: "heap_complete", description: "Heapify " + direction + " complete.", heapArray: entries, success: true });
  return { operation: "heapify_" + direction, steps: out.steps, result: { success: true, summary: "Heapify " + direction + " complete.", heapType: heap.type, priorityQueue: entries } };
}

export function buildHeapFromValues(values: number[], type: HeapType): TreePlan {
  if (values.some((value) => !Number.isFinite(value))) return failure("build_heap", "Every heap value must be finite.");
  const raw = values.map((value, index) => ({ id: "h" + (index + 1), value }));
  const out = writer();
  if (!raw.length) {
    out.add({ type: "start", description: "Start an empty " + type + " heap.", heapArray: [], treeAfter: emptyHeap(type) });
    out.add({ type: "heap_complete", description: "Empty " + type + " heap ready.", heapArray: [], success: true });
    return { operation: "build_" + type + "_heap", steps: out.steps, result: { success: true, summary: "Empty heap ready.", heapType: type, priorityQueue: [] } };
  }
  out.add({ type: "start", description: "Lay out the input as a complete binary tree.", heapArray: raw, treeAfter: snapshot(raw, type) });
  let entries = raw;
  for (let index = Math.floor(entries.length / 2) - 1; index >= 0; index--) {
    out.add({ type: "heapify_down", description: "Heapify down from " + entries[index].value + ".", currentNodeId: entries[index].id, heapIndices: { current: index, left: heapLeftIndex(index), right: heapRightIndex(index) }, heapArray: entries });
    entries = siftDown(out, entries, type, index);
  }
  out.add({ type: "heap_complete", description: type === "min" ? "Min heap built." : "Max heap built.", heapArray: entries, success: true });
  return { operation: "build_" + type + "_heap", steps: out.steps, result: { success: true, summary: (type === "min" ? "Min" : "Max") + " heap built.", heapType: type, priorityQueue: entries } };
}

export type HeapValidation = {
  valid: boolean;
  heapType: HeapType;
  violatingNodes: string[];
  violatingEdges: Array<{ parentId: string; childId: string }>;
};

export function validateHeap(tree: TreeModel): HeapValidation | null {
  const heap = heapOf(tree);
  if (!heap) return null;
  const violatingNodes: string[] = [];
  const violatingEdges: Array<{ parentId: string; childId: string }> = [];
  for (let parent = 0; parent < heap.entries.length; parent++) {
    for (const child of [heapLeftIndex(parent), heapRightIndex(parent)]) {
      if (child >= heap.entries.length) continue;
      if (before(heap.entries[child], heap.entries[parent], heap.type)) {
        violatingNodes.push(heap.entries[parent].id, heap.entries[child].id);
        violatingEdges.push({ parentId: heap.entries[parent].id, childId: heap.entries[child].id });
      }
    }
  }
  return { valid: !violatingEdges.length, heapType: heap.type, violatingNodes: [...new Set(violatingNodes)], violatingEdges };
}

export function buildHeapValidation(tree: TreeModel): TreePlan {
  const error = validHeap(tree);
  if (error) return failure("validate_heap", error);
  const heap = heapOf(tree)!;
  const out = writer();
  const checked: string[] = [];
  for (let index = 0; index < heap.entries.length; index++) {
    const parent = heap.entries[index];
    for (const childIndex of [heapLeftIndex(index), heapRightIndex(index)]) {
      if (childIndex >= heap.entries.length) continue;
      const child = heap.entries[childIndex];
      checked.push(parent.id, child.id);
      const bad = before(child, parent, heap.type);
      out.add({
        type: bad ? "violation" : "validate_heap",
        description: parent.value + (bad ? " breaks the " : " satisfies the ") + heap.type + " heap rule with child " + child.value + ".",
        currentNodeId: parent.id, activeEdge: { parentId: parent.id, childId: child.id, side: childIndex === heapLeftIndex(index) ? "left" : "right" },
        highlightedNodeIds: bad ? [parent.id, child.id] : [], visitedNodeIds: [...new Set(checked)], heapIndices: { current: index, left: heapLeftIndex(index), right: heapRightIndex(index) }, heapArray: heap.entries,
        success: !bad,
      });
    }
  }
  const validation = validateHeap(tree)!;
  out.add({ type: "complete", description: validation.valid ? "This is a valid " + heap.type + " heap." : "Heap violations found.", highlightedNodeIds: validation.violatingNodes, heapArray: heap.entries, success: validation.valid });
  return {
    operation: "validate_heap", steps: out.steps,
    result: { success: validation.valid, valid: validation.valid, summary: validation.valid ? "Heap is valid." : "Heap has violations.", violations: validation.violatingNodes.map((nodeId) => ({ nodeId, reason: "Heap order violation." })), heapType: heap.type },
  };
}

/** Priority queue helpers use the exact same heap operations and entry labels. */
export const buildPriorityEnqueue = buildHeapInsert;
export const buildPriorityDequeue = buildHeapExtract;

export function priorityPeek(tree: TreeModel): HeapEntry | null {
  return heapOf(tree)?.entries[0] ?? null;
}
