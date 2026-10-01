import type {
  RegularExpressionConstructionStep,
  RegularExpressionSyntaxTree,
  RegularExpressionViewState,
} from "@/components/regular-expression/types";
import {
  astChildren,
  traverseAst,
  type RegularExpressionAst,
} from "@/features/regular-expression/model";
import type {
  EpsilonNfaExecution,
  RegularExpressionEvaluation,
} from "@/features/regular-expression/execution";
import type { ThompsonConstructionStep } from "@/features/regular-expression/thompson";
import type { AutomatonExecution } from "@/packages/blocks/automata/model";

export type ExpressionNodeSpan = {
  id: string;
  start: number;
  end: number;
};

/** Presentation adapters keep the mathematical engine renderer-independent. */
export function astToSyntaxTree(
  root: RegularExpressionAst,
): RegularExpressionSyntaxTree {
  const unwrapGroup = (node: RegularExpressionAst): RegularExpressionAst =>
    node.type === "group" ? unwrapGroup(node.expression) : node;

  const label = (node: RegularExpressionAst) => {
    if (node.type === "literal") return node.value;
    if (node.type === "kleene-star") return "*";
    if (node.type === "concatenation") return "·";
    if (node.type === "union") return "|";
    if (node.type === "empty-set") return "∅";
    if (node.type === "epsilon") return "ε";
    return node.type.toUpperCase();
  };

  // Parentheses affect parsing but are not semantic AST operations. Keeping
  // their source spans in the domain model while omitting GROUP boxes here
  // produces the conventional, more legible syntax-tree representation.
  const visibleNodes = traverseAst(root).filter(
    (node) => node.type !== "group",
  );
  const visibleRoot = unwrapGroup(root);

  return {
    rootId: visibleRoot.id,
    nodes: visibleNodes.map((node) => ({
      id: node.id,
      label: label(node),
      kind: node.type,
      children: astChildren(node).map((child) => unwrapGroup(child).id),
    })),
  };
}

export function astToExpressionNodeSpans(
  root: RegularExpressionAst,
): ExpressionNodeSpan[] {
  return traverseAst(root).map((node) => ({
    id: node.id,
    start: node.span.start,
    end: node.span.end,
  }));
}

export function constructionStepsToVisualSteps(
  steps: ThompsonConstructionStep[],
): RegularExpressionConstructionStep[] {
  return steps.map((step) => ({
    id: step.id,
    step: step.step,
    operation: step.operation,
    astNodeId: step.astNodeId,
    title: step.operation.replace("-", " "),
    description: step.description,
    createdStateIds: step.createdStateIds,
    createdTransitionIds: step.createdTransitionIds,
    highlightedExpressionNodeIds: [step.astNodeId],
    highlightedSyntaxTreeNodeIds: [step.astNodeId],
    highlightedStateIds: step.highlightedStateIds,
    highlightedTransitionIds: step.highlightedTransitionIds,
  }));
}

/** Converts one trace position into the shared automata playback shape. */
export function executionAtTraceStep(
  state: EpsilonNfaExecution,
  traceIndex: number,
): AutomatonExecution {
  const index = Math.max(0, Math.min(traceIndex, state.trace.length - 1));
  const traceStep = state.trace[index];
  const steps = state.execution.steps.slice(0, index);
  const visitedStateIds = [
    ...new Set(
      state.trace.slice(0, index + 1).flatMap((step) => step.activeStateIds),
    ),
  ];
  const visitedTransitionIds = [
    ...new Set(
      state.trace
        .slice(0, index + 1)
        .flatMap((step) => step.traversedTransitionIds),
    ),
  ];

  return {
    ...state.execution,
    status: traceStep.status,
    result: traceStep.result,
    inputIndex: traceStep.inputIndex,
    currentStates: traceStep.activeStateIds,
    activeTransitions: traceStep.traversedTransitionIds,
    visitedStates: visitedStateIds,
    visitedTransitions: visitedTransitionIds,
    stepIndex: steps.at(-1)?.stepIndex ?? 0,
    steps,
    error: index === state.trace.length - 1 ? state.execution.error : undefined,
  };
}

export function evaluationToRegularExpressionViewState(
  evaluation: RegularExpressionEvaluation,
  traceIndex = evaluation.execution.trace.length - 1,
): RegularExpressionViewState {
  const index = Math.max(
    0,
    Math.min(traceIndex, evaluation.execution.trace.length - 1),
  );
  const traceStep = evaluation.execution.trace[index];
  const execution = executionAtTraceStep(evaluation.execution, index);

  return {
    input: execution.input,
    inputSymbols: evaluation.execution.inputSymbols,
    currentInputIndex: traceStep.inputIndex,
    highlightedInputIndex:
      traceStep.inputIndex < evaluation.execution.inputSymbols.length
        ? traceStep.inputIndex
        : undefined,
    executionStatus: execution.status,
    result: execution.result,
    showGeneratedAutomaton: true,
    generatedAutomaton: evaluation.construction.automaton,
    generatedAutomatonExecution: execution,
    constructionSteps: constructionStepsToVisualSteps(
      evaluation.construction.trace,
    ),
  };
}
