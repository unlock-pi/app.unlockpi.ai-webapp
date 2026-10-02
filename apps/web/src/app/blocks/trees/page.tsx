"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ExecutionControls } from "@/components/toc/shared/execution-controls";
import { Button } from "@/components/ui/button";
import {
  TreeInspector,
  TreeRenderer,
  addNode,
  buildBstDelete,
  buildBstInsert,
  buildBstSearch,
  buildBstValidation,
  buildAvlInsert,
  buildAvlDelete,
  buildAvlValidation,
  buildTraversal,
  buildHeapFromValues,
  buildHeapInsert,
  buildHeapExtract,
  buildHeapify,
  buildHeapValidation,
  priorityPeek,
  createRoot,
  createTree,
  createTreeState,
  emptyTree,
  highlightTreeNodes,
  inspectNode,
  pauseTreeExecution,
  queueTreePlan,
  removeNode,
  resetTreeExecution,
  selectTreeNode,
  setLeftChild,
  setRightChild,
  startTreeExecution,
  stepTreeExecution,
  subtreeNodeIds,
  updateNode,
} from "@/components/trees";
import type {
  ChildSide,
  TreeKind,
  TreeModel,
  TreeOperationResult,
  TreePlan,
  HeapType,
  TreeRuntimeState,
  TraversalKind,
} from "@/components/trees";

type PresetName = "simple" | "balanced" | "skewed" | "bst" | "ll" | "rr" | "lr" | "rl";

const PRESETS: Array<{ id: PresetName; label: string }> = [
  { id: "simple", label: "Simple" },
  { id: "balanced", label: "Balanced" },
  { id: "skewed", label: "Skewed" },
  { id: "bst", label: "BST demo" },
  { id: "ll", label: "LL demo" },
  { id: "rr", label: "RR demo" },
  { id: "lr", label: "LR demo" },
  { id: "rl", label: "RL demo" },
];

function exampleTree(name: PresetName): TreeModel {
  const kind: TreeKind = name === "bst" ? "bst" : "binary";
  let state = createTreeState(emptyTree(kind));
  const add = (value: number, parentId?: string, side?: ChildSide) => {
    const result = parentId
      ? addNode(state, { value, parentId, side })
      : createRoot(state, { value });
    if (!result.ok || !result.state) throw new Error(result.error ?? "Invalid example tree.");
    state = result.state;
  };
  if (name === "ll" || name === "rr" || name === "lr" || name === "rl") {
    const first = name === "ll" || name === "lr" ? 30 : 10;
    const second = name === "ll" ? 20 : name === "rr" ? 20 : name === "lr" ? 10 : 30;
    const branch: ChildSide = first > second ? "left" : "right";
    const demo = createTreeState(emptyTree("bst"));
    const root = createRoot(demo, { value: first }).state!;
    const pair = addNode(root, { value: second, parentId: "n1", side: branch }).state!;
    return { ...pair.tree, kind: "avl" };
  }
  if (name === "skewed") {
    add(10);
    add(20, "n1", "right");
    add(30, "n2", "right");
    add(40, "n3", "right");
    return state.tree;
  }
  add(50);
  add(30, "n1", "left");
  add(70, "n1", "right");
  if (name !== "simple") {
    add(20, "n2", "left");
    add(40, "n2", "right");
    add(60, "n3", "left");
    add(80, "n3", "right");
  }
  return state.tree;
}

function parsedNumber(value: string) {
  return value.trim() ? Number(value) : Number.NaN;
}

function stepDelay(type?: string) {
  if (type === "traverse_edge" || type === "enqueue_node") return 1350;
  if (type === "rotate_left" || type === "rotate_right") return 2100;
  if (type === "identify_rotation" || type === "detect_imbalance") return 1600;
  if (type === "mark_deleting" || type === "replace_value" || type === "insert_node" || type === "delete_node") return 1450;
  return 1050;
}

function Field({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-sky-500"
      />
    </label>
  );
}

const selectClass = "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-sky-500";

export default function TreesPlaygroundPage() {
  const [state, setState] = useState<TreeRuntimeState>(() => createTreeState(exampleTree("bst")));
  const [message, setMessage] = useState("Choose an operation, or select a node to inspect it.");
  const [error, setError] = useState<string | null>(null);
  const [newValue, setNewValue] = useState("25");
  const [editValue, setEditValue] = useState("35");
  const [bstValue, setBstValue] = useState("25");
  const [heapValue, setHeapValue] = useState("25");
  const [heapValues, setHeapValues] = useState("40, 10, 30, 20, 50");
  const [queueLabel, setQueueLabel] = useState("Task");
  const [parentId, setParentId] = useState("");
  const [moveParentId, setMoveParentId] = useState("n1");
  const [childId, setChildId] = useState("n4");
  const [side, setSide] = useState<ChildSide | "auto">("auto");
  const stateRef = useRef(state);

  const publish = useCallback((result: TreeOperationResult<unknown>) => {
    if (!result.ok) {
      setError(result.error ?? result.summary);
      return false;
    }
    if (result.state) {
      stateRef.current = result.state;
      setState(result.state);
    }
    setError(null);
    setMessage(result.state?.execution.step?.description ?? result.summary);
    return true;
  }, []);

  useEffect(() => {
    if (state.execution.status !== "running") return;
    const timer = window.setTimeout(() => {
      publish(stepTreeExecution(stateRef.current, true));
    }, stepDelay(state.execution.step?.type));
    return () => window.clearTimeout(timer);
  }, [state.execution.status, state.execution.currentStep, state.execution.step?.type, publish]);

  const runPlan = (plan: TreePlan) => {
    publish(queueTreePlan(stateRef.current, plan));
  };
  const loadPreset = (name: PresetName) => {
    const next = createTreeState(exampleTree(name));
    stateRef.current = next;
    setState(next);
    setError(null);
    if (name === "ll") setBstValue("10");
    if (name === "rr") setBstValue("30");
    if (name === "lr" || name === "rl") setBstValue("20");
    setMessage(PRESETS.find((preset) => preset.id === name)?.label + " tree loaded.");
  };
  const selectedId = state.view.selectedNodeId;
  const selected = selectedId ? inspectNode(state.tree, selectedId) : null;
  const heapEntries = state.execution.step?.heapArray ?? state.tree.heap?.entries ?? [];
  const heapType = state.tree.heap?.type ?? "min";
  const buildValues = () => heapValues.split(/[ ,]+/).filter(Boolean).map(Number);
  const selectHeapType = (type: HeapType) => {
    const values = state.tree.heap?.entries.map((entry) => entry.value) ?? [];
    runPlan(buildHeapFromValues(values, type));
  };
  const running = state.execution.status === "running";
  const hasPlan = state.execution.steps.length > 0;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tree playground</h1>
            <p className="mt-1 text-sm text-muted-foreground">Build a tree, then watch traversals, BST decisions, and AVL rotations unfold.</p>
          </div>
          <span className="text-xs text-muted-foreground">Development playground · No agent connection</span>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Example trees">
          <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Examples</span>
          {PRESETS.map((preset) => (
            <Button key={preset.id} size="sm" variant="outline" onClick={() => loadPreset(preset.id)}>{preset.label}</Button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <TreeRenderer
            tree={state.tree}
            view={state.view}
            execution={state.execution}
            onSelect={(id) => publish(selectTreeNode(stateRef.current, id))}
            className="min-h-[28rem]"
          />
          <div className="rounded-xl border border-border bg-card p-4">
            <TreeInspector state={state} />
          </div>
        </div>

        {state.tree.kind === "heap" ? (
          <section className="mt-4 rounded-xl border border-border bg-card px-4 py-3" aria-label="Heap array view">
            <div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Array view</span><span className="text-xs text-muted-foreground">{heapType === "min" ? "Min heap" : "Max heap"}</span></div>
            <div className="flex flex-wrap gap-2">{heapEntries.length ? heapEntries.map((entry, index) => <span key={entry.id} className="rounded-md border border-border bg-background px-2 py-1 text-sm"><span className="mr-1 text-xs text-muted-foreground">{index}</span>{entry.label ? entry.label + ": " : ""}{entry.value}</span>) : <span className="text-sm text-muted-foreground">Build or insert values to begin.</span>}</div>
          </section>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4" aria-live="polite">
          <div className="min-w-0 flex-1">
            <p className={"text-sm font-medium " + (error ? "text-destructive" : "text-foreground")}>{error ?? message}</p>
            {hasPlan ? <p className="mt-1 text-xs text-muted-foreground">{state.execution.operation?.replaceAll("_", " ")} · Step {state.execution.currentStep} of {state.execution.totalSteps}</p> : null}
          </div>
          <ExecutionControls
            ariaLabel="Tree execution controls"
            status={state.execution.status}
            terminal={state.execution.status === "complete"}
            disabled={!hasPlan}
            onTogglePlayback={() => publish(running ? pauseTreeExecution(stateRef.current) : startTreeExecution(stateRef.current))}
            playing={running}
            onStep={() => publish(stepTreeExecution(stateRef.current))}
            onReset={() => publish(resetTreeExecution(stateRef.current))}
          />
        </div>

        {state.execution.step?.output?.length ? (
          <p className="border-b border-border py-3 text-sm"><span className="mr-2 text-muted-foreground">Order</span>{state.execution.step.output.join(" → ")}</p>
        ) : null}

        <div className="grid gap-x-10 gap-y-8 py-7 md:grid-cols-2 xl:grid-cols-3">
          <section className="space-y-4" aria-label="Tree operations">
            <h2 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Build & edit</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select className={selectClass} value={state.tree.kind} aria-label="Tree kind" onChange={(event) => publish(createTree(event.target.value as TreeKind))}>
                <option value="binary">Binary tree</option>
                <option value="bst">BST</option>
                <option value="avl">AVL</option>
                <option value="heap">Heap</option>
              </select>
              <Button size="sm" variant="outline" onClick={() => publish(createTree(state.tree.kind))}>Create empty</Button>
            </div>
            {state.tree.kind !== "avl" && state.tree.kind !== "heap" ? <>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <Field label={state.tree.rootId ? "New value" : "Root value"} value={newValue} onChange={setNewValue} />
              <Button size="sm" onClick={() => publish(state.tree.rootId
                ? addNode(stateRef.current, { value: parsedNumber(newValue), parentId: parentId || undefined, side: side === "auto" ? undefined : side })
                : createRoot(stateRef.current, { value: parsedNumber(newValue) }))}>
                {state.tree.rootId ? "Add node" : "Create root"}
              </Button>
            </div>
            {state.tree.rootId ? (
              <div className="flex flex-wrap gap-2">
                <select className={selectClass} aria-label="Parent node" value={parentId} onChange={(event) => setParentId(event.target.value)}>
                  <option value="">{state.tree.kind === "bst" ? "Find BST position" : "First open place"}</option>
                  {state.tree.nodes.map((node) => <option key={node.id} value={node.id}>Parent {node.value}</option>)}
                </select>
                <select className={selectClass} aria-label="Child side" value={side} onChange={(event) => setSide(event.target.value as ChildSide | "auto")}>
                  <option value="auto">First open side</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
            ) : null}
            {selected ? (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Selected: {selected.node.value} · removing it also removes its subtree.</p>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2">
                  <Field label="Change value" value={editValue} onChange={setEditValue} />
                  <Button size="sm" variant="outline" onClick={() => publish(updateNode(stateRef.current, { id: selected.node.id, value: parsedNumber(editValue) }))}>Update</Button>
                  <Button size="sm" variant="outline" onClick={() => publish(removeNode(stateRef.current, selected.node.id))}>Remove</Button>
                </div>
                <Button size="sm" variant="ghost" onClick={() => publish(highlightTreeNodes(stateRef.current, subtreeNodeIds(state.tree, selected.node.id)))}>Show this subtree</Button>
              </div>
            ) : null}
            {state.tree.nodes.length > 1 ? (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Move an existing branch</p>
                <div className="flex flex-wrap gap-2">
                  <select className={selectClass} aria-label="New parent" value={moveParentId} onChange={(event) => setMoveParentId(event.target.value)}>
                    {state.tree.nodes.map((node) => <option key={node.id} value={node.id}>Under {node.value}</option>)}
                  </select>
                  <select className={selectClass} aria-label="Branch to move" value={childId} onChange={(event) => setChildId(event.target.value)}>
                    {state.tree.nodes.filter((node) => node.id !== state.tree.rootId).map((node) => <option key={node.id} value={node.id}>Move {node.value}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => publish(setLeftChild(stateRef.current, moveParentId, childId))}>Set left child</Button>
                  <Button size="sm" variant="outline" onClick={() => publish(setRightChild(stateRef.current, moveParentId, childId))}>Set right child</Button>
                </div>
              </div>
            ) : null}
            </> : <p className="text-sm text-muted-foreground">{state.tree.kind === "heap" ? "Use Heap controls to keep the array and tree synchronized." : "Use AVL Insert and Delete below to preserve balance."}</p>}
          </section>

          {state.tree.kind !== "heap" ? <section className="space-y-4" aria-label="Tree traversals">
            <h2 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Traversals</h2>
            <p className="text-sm text-muted-foreground">Watch the current node and the visit order grow step by step.</p>
            <div className="flex flex-wrap gap-2">
              {([
                ["preorder", "Preorder"],
                ["inorder", "Inorder"],
                ["postorder", "Postorder"],
                ["levelOrder", "Level order"],
              ] as Array<[TraversalKind, string]>).map(([kind, label]) => (
                <Button key={kind} size="sm" variant="outline" onClick={() => runPlan(buildTraversal(stateRef.current.tree, kind))}>{label}</Button>
              ))}
            </div>
          </section> : null}

          {state.tree.kind !== "avl" && state.tree.kind !== "heap" ? <section className="space-y-4" aria-label="BST operations">
            <h2 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Binary search tree</h2>
            <Field label="Value" value={bstValue} onChange={setBstValue} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => runPlan(buildBstInsert(stateRef.current.tree, parsedNumber(bstValue)))}>Insert</Button>
              <Button size="sm" variant="outline" onClick={() => runPlan(buildBstSearch(stateRef.current.tree, parsedNumber(bstValue)))}>Search</Button>
              <Button size="sm" variant="outline" onClick={() => runPlan(buildBstDelete(stateRef.current.tree, parsedNumber(bstValue)))}>Delete</Button>
              <Button size="sm" variant="outline" onClick={() => runPlan(buildBstValidation(stateRef.current.tree))}>Validate BST</Button>
            </div>
            <p className="text-xs text-muted-foreground">Use BST demo for a valid search tree, or Balanced to inspect validation on an ordinary binary tree.</p>
          </section> : null}

          {state.tree.kind === "heap" ? <section className="space-y-4" aria-label="Heap operations">
            <h2 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Heap</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={heapType === "min" ? "default" : "outline"} onClick={() => selectHeapType("min")}>Min heap</Button>
              <Button size="sm" variant={heapType === "max" ? "default" : "outline"} onClick={() => selectHeapType("max")}>Max heap</Button>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2">
              <Field label="Value / priority" value={heapValue} onChange={setHeapValue} />
              <Button size="sm" variant="outline" onClick={() => runPlan(buildHeapInsert(stateRef.current.tree, parsedNumber(heapValue)))}>Insert</Button>
              <Button size="sm" variant="outline" onClick={() => runPlan(buildHeapExtract(stateRef.current.tree))}>Extract</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => runPlan(buildHeapify(stateRef.current.tree, "up"))}>Heapify up</Button>
              <Button size="sm" variant="outline" onClick={() => runPlan(buildHeapify(stateRef.current.tree, "down"))}>Heapify down</Button>
              <Button size="sm" variant="outline" onClick={() => runPlan(buildHeapValidation(stateRef.current.tree))}>Validate</Button>
            </div>
            <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">Build from values
              <input value={heapValues} onChange={(event) => setHeapValues(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-sky-500" />
            </label>
            <Button size="sm" variant="outline" onClick={() => runPlan(buildHeapFromValues(buildValues(), heapType))}>Build heap</Button>
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Priority queue</p>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-end gap-2">
                <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">Item<input value={queueLabel} onChange={(event) => setQueueLabel(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-sky-500" /></label>
                <Field label="Priority" value={heapValue} onChange={setHeapValue} />
                <Button size="sm" variant="outline" onClick={() => runPlan(buildHeapInsert(stateRef.current.tree, parsedNumber(heapValue), queueLabel))}>Enqueue</Button>
                <Button size="sm" variant="outline" onClick={() => runPlan(buildHeapExtract(stateRef.current.tree))}>Dequeue</Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Peek: {priorityPeek(state.tree)?.label ?? priorityPeek(state.tree)?.value ?? "empty"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{[...heapEntries].sort((a, b) => heapType === "min" ? a.value - b.value : b.value - a.value).map((entry) => (entry.label ?? entry.value) + ": " + entry.value).join(" · ") || "empty"}</p>
            </div>
          </section> : null}

          {state.tree.kind === "avl" ? <section className="space-y-4" aria-label="AVL operations">
            <h2 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">AVL tree</h2>
            <Field label="Value" value={bstValue} onChange={setBstValue} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => runPlan(buildAvlInsert(stateRef.current.tree, parsedNumber(bstValue)))}>AVL Insert</Button>
              <Button size="sm" variant="outline" onClick={() => runPlan(buildAvlDelete(stateRef.current.tree, parsedNumber(bstValue)))}>AVL Delete</Button>
              <Button size="sm" variant="outline" onClick={() => runPlan(buildAvlValidation(stateRef.current.tree))}>Validate AVL</Button>
            </div>
            <p className="text-xs text-muted-foreground">Choose an LL, RR, LR, or RL demo above, then insert the suggested value to watch the rotation.</p>
          </section> : null}
        </div>
      </div>
    </main>
  );
}
