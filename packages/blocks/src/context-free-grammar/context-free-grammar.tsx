"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { reconcileContextFreeGrammarProps } from "./authoring";
import { useContextFreeGrammarAgentView } from "./agent-view-context";
import { ProductionTable } from "./production-table";
import { DerivationView } from "./derivation-view";
import { DERIVATION_ANIMATION_MS, visibleDerivationNodes } from "./derivation-playback";
import { ParseTree } from "./parse-tree";
import type { ContextFreeGrammarBlockProps, DerivationStep, ParseTreeData } from "./types";
import { InputString } from "@unlockpi/ui";
import { ExecutionControls } from "@unlockpi/ui";

export const DEFAULT_CFG_DERIVATION: DerivationStep[] = [
  { id: "d0", symbols: ["S"], activeTreeNodeId: "s0" },
  { id: "d1", symbols: ["a", "S", "b"], appliedProductionId: "p0", highlightedRange: { start: 1, end: 2 }, activeTreeNodeId: "s1", highlightedTreeEdges: [{ from: "s0", to: "s1" }] },
  { id: "d2", symbols: ["a", "a", "S", "b", "b"], appliedProductionId: "p0", highlightedRange: { start: 2, end: 3 }, activeTreeNodeId: "s2", highlightedTreeEdges: [{ from: "s1", to: "s2" }] },
  { id: "d3", symbols: ["a", "a", "b", "b"], appliedProductionId: "p1", activeTreeNodeId: "epsilon", highlightedTreeEdges: [{ from: "s2", to: "epsilon" }] },
];

export const DEFAULT_CFG_TREE: ParseTreeData = {
  rootId: "s0",
  nodes: [
    { id: "s0", label: "S", children: ["a0", "s1", "b0"] },
    { id: "a0", label: "a" },
    { id: "s1", label: "S", children: ["a1", "s2", "b1"] },
    { id: "b0", label: "b" },
    { id: "a1", label: "a" },
    { id: "s2", label: "S", children: ["epsilon"] },
    { id: "b1", label: "b" },
    { id: "epsilon", label: "ε" },
  ],
};

export const DEFAULT_CFG_PROPS: ContextFreeGrammarBlockProps = {
  grammar: {
    variables: ["S"],
    terminals: ["a", "b"],
    startSymbol: "S",
    productions: [
      { id: "p0", lhs: "S", rhs: ["a", "S", "b"] },
      { id: "p1", lhs: "S", rhs: [] },
    ],
  },
  input: "aabb",
  derivationSteps: DEFAULT_CFG_DERIVATION,
  parseTree: DEFAULT_CFG_TREE,
  showGrammar: true,
  showDerivation: true,
  showParseTree: true,
  showInput: true,
};

type RenderProps = ContextFreeGrammarBlockProps & { id: string };

function ContextFreeGrammarBlockComponent(props: RenderProps) {
  const authored = useMemo(() => reconcileContextFreeGrammarProps(props), [props]);
  const agent = useContextFreeGrammarAgentView(props.id);
  const view = agent?.state;
  const [localStep, setLocalStep] = useState(0);
  const grammar = view?.grammar ?? authored.grammar;
  const steps = view?.derivationSteps ?? authored.derivationSteps ?? [];
  const tree = view?.parseTree !== undefined ? view.parseTree : authored.parseTree;
  const stepIndex = Math.max(0, Math.min(view?.currentDerivationStep ?? localStep, Math.max(0, steps.length - 1)));
  const current = steps[stepIndex];
  const inputSymbols = view?.inputSymbols ?? [...(view?.input ?? authored.input)];
  const inputIndex = view?.currentInputIndex ?? current?.inputIndex ?? 0;
  const highlightedInputIndex = view?.highlightedInputIndex ?? (current?.inputIndex === undefined ? -1 : inputIndex);
  const showLeft = authored.showGrammar || authored.showDerivation;

  const visibleNodes = tree ? visibleDerivationNodes(tree, steps, stepIndex, view?.selectedParseTreeNodeId, view?.highlightedSubtreeRootIds) : undefined;
  const previousNodes = new Set(tree ? visibleDerivationNodes(tree, steps, Math.max(0, stepIndex - 1)) : []);
  const enteringNodes = visibleNodes?.filter((id) => !previousNodes.has(id)) ?? [];
  const animationKey = view?.playbackId ?? `local:${stepIndex}`;
  const onPlaybackComplete = agent?.onPlaybackComplete;
  const hasEnteringNodes = enteringNodes.length > 0;
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => {
      onPlaybackComplete?.(animationKey, 1);
    }, (stepIndex > 0 || hasEnteringNodes) && !reduced ? DERIVATION_ANIMATION_MS : 0);
    return () => clearTimeout(timer);
  }, [animationKey, stepIndex, hasEnteringNodes, onPlaybackComplete]);

  return <section className="canvas-context-free-grammar-block relative flex min-h-0 flex-col w-full min-w-0 overflow-hidden rounded-2xl border border-border/75 bg-card shadow-sm" aria-label="Context-free grammar">
    <header className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-5">
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Context-free grammar</h2>
    </header>
    <div className={showLeft && authored.showParseTree ? "grid min-h-0 flex-1 min-w-0 lg:grid-cols-[minmax(0,0.36fr)_minmax(0,0.64fr)]" : "grid min-h-0 flex-1 min-w-0"}>
      {showLeft ? <div className="flex min-h-0 min-w-0 flex-col divide-y divide-border/50 border-b border-border/60 lg:border-b-0 lg:border-r">
        {authored.showGrammar ? <section className="px-4 py-4 sm:px-5" aria-label="Grammar productions">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Productions</h3>
          <ProductionTable grammar={grammar} selectedProductionId={view?.selectedProductionId ?? current?.appliedProductionId} highlightedProductionIds={view?.highlightedProductionIds} />
        </section> : null}
        {authored.showDerivation ? <section className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-5" aria-label="Derivation">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Derivation</h3>
          <DerivationView steps={steps} currentStep={stepIndex} animationKey={animationKey} />
        </section> : null}
      </div> : null}
      {authored.showParseTree ? <section className="cfg-parse-region flex min-h-[18rem] min-w-0 flex-col px-4 py-4 sm:px-5" aria-label="Parse tree">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Parse tree</h3>
        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
          <ParseTree tree={tree} visibleNodeIds={visibleNodes} enteringNodeIds={enteringNodes} animationKey={animationKey} fillHeight selectedNodeId={view?.selectedParseTreeNodeId} highlightedNodeIds={view?.highlightedParseTreeNodeIds ?? current?.highlightedTreeNodeIds} highlightedSubtreeRootIds={view?.highlightedSubtreeRootIds} activeNodeId={view?.activeParseTreeNodeId ?? current?.activeTreeNodeId} highlightedEdges={view?.highlightedParseTreeEdges ?? current?.highlightedTreeEdges} />
        </div>
      </section> : null}
    </div>
    <footer className="flex shrink-0 min-w-0 flex-wrap items-end justify-between gap-4 border-t border-border/60 px-4 py-3 sm:px-5">
      {authored.showInput ? <InputString symbols={inputSymbols} currentIndex={inputIndex} highlightedIndex={highlightedInputIndex} result={view?.result} /> : null}
      <div className="flex items-center gap-3">
        {steps.length > 1 ? <span className="text-xs tabular-nums text-muted-foreground">{stepIndex + 1} / {steps.length}</span> : null}
      </div>
    </footer>

    {/* Floating controls: positioned slightly above the footer for easier access */}
    <div className="absolute right-4 bottom-14 z-20">
      <ExecutionControls ariaLabel="Grammar visual controls" disabled={!agent?.onStep && steps.length < 2} terminal={steps.length > 0 && stepIndex >= steps.length - 1} onStep={agent?.onStep ?? (() => setLocalStep((index) => Math.min(index + 1, steps.length - 1)))} onReset={agent?.onReset ?? (() => setLocalStep(0))} />
    </div>
  </section>;
}

const MemoizedBlock = memo(ContextFreeGrammarBlockComponent, (previous, next) => JSON.stringify(previous) === JSON.stringify(next));
export function ContextFreeGrammarBlock(props: RenderProps) {
  return <MemoizedBlock key={JSON.stringify(props)} {...props} />;
}
