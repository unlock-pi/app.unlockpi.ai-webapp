"use client";

import { memo, useEffect, useMemo, useState } from "react";

import { TransitionDiagram } from "@/components/automata/transition-diagram";
import { useExecutionPlayback } from "@/components/automata/use-execution-playback";
import { createAutomatonExecution, type AutomatonExecution } from "@/components/automata/model";
import { useRegularExpressionAgentView } from "@/components/regular-expression/agent-view-context";
import {
  astToExpressionNodeSpans,
  astToSyntaxTree,
} from "@/components/regular-expression/engine-adapters";
import { reconcileRegularExpressionProps } from "@/components/regular-expression/authoring";
import { ExpressionView } from "@/components/regular-expression/expression-view";
import { RegularExpressionInputString } from "@/components/regular-expression/input-string";
import { SyntaxTree } from "@/components/regular-expression/syntax-tree";
import type {
  RegularExpressionBlockProps,
  RegularExpressionConstructionStep,
  RegularExpressionExpressionSegment,
  RegularExpressionSyntaxTree,
} from "@/components/regular-expression/types";
import { ExecutionControls } from "@/components/toc/shared/execution-controls";
import { parseRegularExpression } from "@/features/regular-expression/parser";

export const DEFAULT_EXPRESSION_SEGMENTS: RegularExpressionExpressionSegment[] =
  [
    { id: "group", text: "(a|b)", kind: "group" },
    { id: "star", text: "*", kind: "kleene-star" },
    { id: "a", text: "a", kind: "literal" },
    { id: "b-1", text: "b", kind: "literal" },
    { id: "b-2", text: "b", kind: "literal" },
  ];

export const DEFAULT_SYNTAX_TREE: RegularExpressionSyntaxTree = {
  rootId: "concat-root",
  nodes: [
    {
      id: "concat-root",
      label: "·",
      kind: "concatenation",
      children: ["star", "concat-a"],
    },
    {
      id: "star",
      label: "*",
      kind: "kleene-star",
      children: ["union"],
    },
    {
      id: "union",
      label: "|",
      kind: "union",
      children: ["left-a", "left-b"],
    },
    { id: "left-a", label: "a", kind: "literal" },
    { id: "left-b", label: "b", kind: "literal" },
    {
      id: "concat-a",
      label: "·",
      kind: "concatenation",
      children: ["right-a", "concat-b"],
    },
    { id: "right-a", label: "a", kind: "literal" },
    {
      id: "concat-b",
      label: "·",
      kind: "concatenation",
      children: ["right-b-1", "right-b-2"],
    },
    { id: "right-b-1", label: "b", kind: "literal" },
    { id: "right-b-2", label: "b", kind: "literal" },
  ],
};

export const DEFAULT_CONSTRUCTION_STEPS: RegularExpressionConstructionStep[] = [
  {
    id: "literal-a",
    title: "Create a literal fragment",
    description: "Introduce a fragment for the literal a.",
    highlightedExpressionNodeIds: ["a"],
  },
  {
    id: "literal-b",
    title: "Create a second literal fragment",
    description: "Introduce a fragment for the literal b.",
    highlightedExpressionNodeIds: ["b-1"],
  },
  {
    id: "combine",
    title: "Combine fragments",
    description: "Connect the fragments for the selected expression node.",
    highlightedSyntaxTreeNodeIds: ["union"],
  },
];

const IDLE_EXECUTION: AutomatonExecution = {
  executionId: "regular-expression-idle",
  automatonId: "",
  status: "idle",
  input: "",
  inputIndex: 0,
  currentStates: [],
  activeTransitions: [],
  visitedStates: [],
  visitedTransitions: [],
  stepIndex: 0,
  result: "unknown",
  steps: [],
};

type RenderProps = RegularExpressionBlockProps & { id: string };

const propsKey = (props: RenderProps) => JSON.stringify(props);

function RegularExpressionBlockComponent(props: RenderProps) {
  const authored = useMemo(
    () => reconcileRegularExpressionProps(props),
    [props],
  );
  const agent = useRegularExpressionAgentView(props.id);
  const view = agent?.state;
  const [localStep, setLocalStep] = useState(0);

  const expression = view?.expression ?? authored.expression;
  const parsed = useMemo(
    () => parseRegularExpression(expression),
    [expression],
  );
  const segments = view?.expressionSegments ?? authored.expressionSegments;
  const tree =
    view?.syntaxTree ??
    (parsed.ok ? astToSyntaxTree(parsed.value.root) : authored.syntaxTree);
  const nodeSpans = parsed.ok
    ? astToExpressionNodeSpans(parsed.value.root)
    : [];
  const steps = view?.constructionSteps ?? authored.constructionSteps ?? [];
  const currentStep = view?.currentConstructionStep ?? localStep;
  const boundedStep = Math.max(
    0,
    Math.min(currentStep, Math.max(0, steps.length - 1)),
  );
  const current = steps[boundedStep];
  const activeConstructionStep =
    !agent || view?.displayMode === "construction" ? current : undefined;
  const inputSymbols = view?.inputSymbols ?? [
    ...(view?.input ?? authored.input),
  ];
  const canStep = Boolean(view?.generatedAutomaton) &&
    boundedStep < Math.max(0, steps.length - 1);
  const constructionComplete = Boolean(
    view?.displayMode === "construction" &&
    view.currentConstructionStep !== undefined &&
    steps.length > 0 &&
    view.currentConstructionStep >= steps.length - 1,
  );
  const conversionComplete = Boolean(
    view?.conversionPlaybackActive &&
      (view.generatedDfa?.alphabet.length === 0 ||
        ((view.conversionStepCount ?? 0) > 0 &&
          view.currentConversionStep !== undefined &&
          view.currentConversionStep >= (view.conversionStepCount ?? 0) - 1)),
  );

  // Only the selected result is visible. The conversion source stays in
  // agent state for trace/execution, without occupying a second graph panel.
  const visibleAutomaton =
    view?.generatedAutomaton ?? view?.generatedDfa ?? view?.sourceAutomaton ?? null;
  const graphAutomaton = visibleAutomaton?.type === "nfa" ? visibleAutomaton : null;
  const generatedDfa = visibleAutomaton?.type === "dfa" ? visibleAutomaton : null;
  const fallbackExecution = useMemo(
    () =>
      graphAutomaton
        ? createAutomatonExecution(
            graphAutomaton,
            view?.input ?? authored.input,
          )
        : IDLE_EXECUTION,
    [graphAutomaton, view?.input, authored.input],
  );
  const dfaFallbackExecution = useMemo(
    () => generatedDfa ? createAutomatonExecution(generatedDfa) : IDLE_EXECUTION,
    [generatedDfa],
  );
  const generatedExecution = view?.generatedAutomatonExecution;
  const execution = generatedExecution ?? fallbackExecution;
  const { displayedExecution, flowProgress, isTransitioning } =
    useExecutionPlayback(execution, 3_000);
  const {
    displayedExecution: displayedSourceExecution,
    flowProgress: sourceFlowProgress,
    isTransitioning: isSourceTransitioning,
  } = useExecutionPlayback(view?.sourceAutomatonExecution ?? fallbackExecution, 3_000);
  const {
    displayedExecution: displayedDfaExecution,
    flowProgress: mirroredDfaFlowProgress,
    isTransitioning: isDfaTransitioning,
  } = useExecutionPlayback(view?.generatedDfaExecution ?? dfaFallbackExecution, 3_000);
  const onPlaybackComplete = agent?.onPlaybackComplete;
  useEffect(() => {
    if (
      generatedExecution &&
      displayedExecution.executionId === generatedExecution.executionId &&
      !isTransitioning &&
      displayedExecution.steps.length >= generatedExecution.steps.length
    ) {
      onPlaybackComplete?.(generatedExecution.executionId, displayedExecution.steps.length);
    }
  }, [generatedExecution, displayedExecution, isTransitioning, onPlaybackComplete]);

  const hasGeneratedExecution = Boolean(
    generatedExecution &&
    displayedExecution.automatonId === generatedExecution.automatonId,
  );
  const selectedGraphIsDfa =
    displayedExecution.automatonId === generatedDfa?.id;
  const dfaExecution = selectedGraphIsDfa
    ? displayedExecution
    : displayedDfaExecution.automatonId === generatedDfa?.id
      ? displayedDfaExecution
      : dfaFallbackExecution;
  const dfaFlowProgress = selectedGraphIsDfa
    ? flowProgress
    : mirroredDfaFlowProgress;
  const isConstructionPreview = view?.executionStatus === "paused";
  const shownInputIndex =
    hasGeneratedExecution && !isConstructionPreview
      ? displayedExecution.inputIndex
      : (view?.currentInputIndex ?? 0);
  const shownResult =
    hasGeneratedExecution && !isConstructionPreview
      ? displayedExecution.result
      : view?.result;
  const selectedGraphIsSource =
    displayedExecution.automatonId === graphAutomaton?.id;
  const sourceExecution = selectedGraphIsSource
    ? displayedExecution
    : displayedSourceExecution.automatonId === graphAutomaton?.id
      ? displayedSourceExecution
      : fallbackExecution;
  const graphFlowProgress = selectedGraphIsSource
    ? flowProgress
    : sourceFlowProgress;
  const graphExecution =
    sourceExecution === fallbackExecution && activeConstructionStep
      ? {
          ...sourceExecution,
          currentStates:
            activeConstructionStep.highlightedStateIds?.length
              ? activeConstructionStep.highlightedStateIds
              : sourceExecution.currentStates,
          activeTransitions: activeConstructionStep.highlightedTransitionIds ?? [],
          visitedTransitions: activeConstructionStep.highlightedTransitionIds ?? [],
        }
      : sourceExecution;

  return (
    <section
      className="canvas-regular-expression-block flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/75 bg-card shadow-sm"
      aria-label="Regular expression"
    >
      <header className="border-b border-border/60 px-4 py-2 text-center sm:px-6 sm:py-3">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Regular expression
        </p>
        <ExpressionView
          expression={expression}
          segments={segments}
          nodeSpans={nodeSpans}
          selectedNodeId={view?.selectedExpressionNodeId}
          highlightedNodeIds={
            view?.highlightedExpressionNodeIds ??
            activeConstructionStep?.highlightedExpressionNodeIds
          }
          activeNodeId={activeConstructionStep?.astNodeId}
          className="mx-auto min-h-12 max-w-3xl border-0 bg-transparent py-1 text-3xl shadow-none"
        />
        {!parsed.ok ? (
          <p className="mt-3 text-sm text-destructive">
            {parsed.errors[0]?.message ?? "This expression is not valid."}
          </p>
        ) : null}
      </header>

      <div
        className={
          generatedDfa && graphAutomaton
            ? "grid min-h-0 min-w-0 flex-1 divide-y divide-border/60 xl:grid-cols-[minmax(0,0.62fr)_minmax(0,1.3fr)_minmax(0,0.95fr)] xl:grid-rows-[minmax(0,1fr)] xl:divide-x xl:divide-y-0"
            : generatedDfa || graphAutomaton
              ? "grid min-h-0 min-w-0 flex-1 divide-y divide-border/60 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:grid-rows-[minmax(0,1fr)] xl:divide-x xl:divide-y-0"
              : "grid min-h-0 min-w-0 flex-1"
        }
      >
        <section className="flex min-h-0 min-w-0 flex-col px-4 py-4 sm:px-6" aria-label="Syntax tree">
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Syntax tree
          </h3>
          <SyntaxTree
            compact
            className="mt-2 flex min-h-0 min-w-0 flex-1 items-center"
            tree={tree}
            selectedNodeId={view?.selectedSyntaxTreeNodeId}
            highlightedNodeIds={
              view?.highlightedSyntaxTreeNodeIds ??
              activeConstructionStep?.highlightedSyntaxTreeNodeIds
            }
            highlightedSubtreeRootIds={view?.highlightedSyntaxTreeSubtreeIds}
            activeNodeId={
              view?.activeSyntaxTreeNodeId ?? activeConstructionStep?.astNodeId ?? null
            }
          />
        </section>

        {graphAutomaton ? (
        <section className="flex min-h-0 min-w-0 flex-col px-4 py-4 sm:px-6" aria-label="Generated automaton">
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {graphAutomaton?.type === "dfa" ? "DFA" : "ε-NFA"}
          </h3>
          <TransitionDiagram
              compactSpacing
              key={graphAutomaton.id}
              automaton={graphAutomaton}
              execution={graphExecution}
              flowProgress={graphFlowProgress}
              flowDurationMs={3_000}
              viewportClassName="mt-2 h-[18rem] sm:h-[20rem] xl:h-auto xl:min-h-[18rem] xl:flex-1"
            />
        </section>
        ) : null}
        {generatedDfa ? (
          <section className="flex min-h-0 min-w-0 flex-col px-4 py-4 sm:px-6" aria-label="Generated DFA">
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              DFA
            </h3>
            <TransitionDiagram
              compactSpacing
              key={generatedDfa.id}
              automaton={generatedDfa}
              execution={dfaExecution}
              flowProgress={dfaFlowProgress}
              flowDurationMs={3_000}
              viewportClassName="mt-2 h-[18rem] sm:h-[20rem] xl:h-auto xl:min-h-[18rem] xl:flex-1"
            />
          </section>
        ) : null}
      </div>

      <footer className="flex min-w-0 flex-wrap items-center justify-between gap-4 border-t border-border/60 px-4 py-3 sm:px-6">
        <RegularExpressionInputString
          symbols={inputSymbols}
          currentIndex={shownInputIndex}
          highlightedIndex={
            isConstructionPreview ? undefined : shownInputIndex
          }
          result={shownResult}
          label="Input"
        />
        <div className="flex flex-wrap items-center gap-3">
          {view?.conversionPlaybackActive &&
          (view.conversionStepCount ?? 0) > 0 ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {(view.currentConversionStep ?? 0) + 1} / {view.conversionStepCount}
            </span>
          ) : view?.generatedAutomaton &&
            steps.length > 0 &&
            view.displayMode === "construction" ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {boundedStep + 1} / {steps.length}
            </span>
          ) : null}
          <ExecutionControls
            ariaLabel="Regular expression visual controls"
            className="regular-expression-control"
            disabled={
              isTransitioning ||
              (Boolean(graphAutomaton) && isSourceTransitioning) ||
              (Boolean(generatedDfa) && isDfaTransitioning) ||
              !view?.generatedAutomaton ||
              constructionComplete ||
              conversionComplete ||
              (!agent && !canStep)
            }
            terminal={!agent && !canStep}
            onStep={
              agent?.onStep ??
              (() =>
                setLocalStep((step) =>
                  Math.min(step + 1, Math.max(0, steps.length - 1)),
                ))
            }
            onReset={agent?.onReset ?? (() => setLocalStep(0))}
          />
        </div>
      </footer>
    </section>
  );
}

const MemoizedRegularExpressionBlock = memo(
  RegularExpressionBlockComponent,
  (previous, next) => propsKey(previous) === propsKey(next),
);

// Puck expects a regular component function; memo shields this interactive block
// from unrelated editor updates.
export function RegularExpressionBlock(props: RenderProps) {
  return <MemoizedRegularExpressionBlock key={propsKey(props)} {...props} />;
}
