"use client";

import { inspectNode, inspectTree } from "./operations";
import { treeNode } from "./model";
import type { TreeRuntimeState } from "./types";

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

/** A compact projection of the same model and execution state the renderer sees. */
export function TreeInspector({ state }: { state: TreeRuntimeState }) {
  const tree = inspectTree(state.tree);
  const selected = state.view.selectedNodeId ? inspectNode(state.tree, state.view.selectedNodeId) : null;
  const step = state.execution.step;
  const heap = state.tree.heap;
  const selectedIndex = heap && selected ? heap.entries.findIndex((entry) => entry.id === selected.node.id) : -1;
  return (
    <aside className="space-y-5" aria-label="Tree inspector">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tree</h2>
        <dl>
          <Fact label="Type" value={tree.kind === "heap" ? (heap?.type === "min" ? "Min heap" : "Max heap") : tree.kind === "avl" ? "AVL tree" : tree.kind === "bst" ? "Binary search tree" : "Binary tree"} />
          {heap ? <Fact label="Size" value={heap.entries.length} /> : null}
          <Fact label="Nodes" value={tree.nodeCount} />
          <Fact label="Root" value={step?.displayValues?.[tree.root?.id ?? ""] ?? tree.root?.value ?? "None"} />
          <Fact label="Height" value={tree.height} />
        </dl>
      </section>
      {selected ? (
        <section className="border-t border-border pt-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{tree.kind === "avl" ? "AVL node" : "Selected node"}</h2>
          <dl>
            <Fact label="Value" value={step?.displayValues?.[selected.node.id] ?? selected.node.value} />
            <Fact label="Parent" value={selected.parent?.value ?? "None"} />
            <Fact label="Left" value={treeNode(state.tree, selected.node.leftChildId)?.value ?? "None"} />
            <Fact label="Right" value={treeNode(state.tree, selected.node.rightChildId)?.value ?? "None"} />
            <Fact label="Sibling" value={selected.sibling?.value ?? "None"} />
            <Fact label="Depth" value={selected.depth} />
            <Fact label="Height" value={selected.height} />
            {heap && selectedIndex >= 0 ? <><Fact label="Array index" value={selectedIndex} /><Fact label="Parent index" value={selectedIndex ? Math.floor((selectedIndex - 1) / 2) : "None"} /><Fact label="Left index" value={selectedIndex * 2 + 1 < heap.entries.length ? selectedIndex * 2 + 1 : "None"} /><Fact label="Right index" value={selectedIndex * 2 + 2 < heap.entries.length ? selectedIndex * 2 + 2 : "None"} /></> : null}
            {tree.kind === "avl" ? <><Fact label="Balance factor" value={(selected.balanceFactor > 0 ? "+" : "") + selected.balanceFactor} /><Fact label="Status" value={Math.abs(selected.balanceFactor) <= 1 ? "Balanced" : "Unbalanced"} /></> : null}
          </dl>
        </section>
      ) : null}
      {step ? (
        <section className="border-t border-border pt-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Now</h2>
          <p className="text-sm text-foreground">{step.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">Step {state.execution.currentStep} of {state.execution.totalSteps}</p>
          {step.height !== undefined ? <p className="mt-2 text-xs text-muted-foreground">Height {step.height}</p> : null}
          {step.balanceFactor !== undefined ? <p className="mt-2 text-sm font-medium text-sky-500">Balance {(step.balanceFactor > 0 ? "+" : "") + step.balanceFactor}{step.rotationCase ? " · " + step.rotationCase + " rotation" : ""}</p> : null}
          {step.comparison ? <p className="mt-2 text-sm font-medium text-sky-500">{step.comparison.value} {step.comparison.relation} {step.comparison.against} · {step.direction ?? (step.comparison.relation === "<" ? "left" : step.comparison.relation === ">" ? "right" : "match")}</p> : null}
          {step.queue ? <p className="mt-2 text-xs text-muted-foreground">Queue: {step.queue.map((id) => treeNode(state.tree, id)?.value ?? id).join(" → ") || "empty"}</p> : null}
          {step.heapIndices ? <p className="mt-2 text-xs text-muted-foreground">Index {step.heapIndices.current}{step.heapIndices.parent !== undefined ? " · parent " + step.heapIndices.parent : ""}{step.heapIndices.left !== undefined ? " · left " + step.heapIndices.left : ""}{step.heapIndices.right !== undefined ? " · right " + step.heapIndices.right : ""}</p> : null}
          {step.output?.length ? <p className="mt-2 text-xs text-muted-foreground">Order: {step.output.join(" → ")}</p> : null}
          {state.execution.status === "complete" && state.execution.result ? (
            <p className="mt-2 text-sm font-medium text-foreground">{state.execution.result.summary}</p>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
