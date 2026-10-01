import type {
  Automaton,
  AutomatonExecution,
} from "@/packages/blocks/automata/model";
import type { RegularExpressionViewState } from "@/components/regular-expression/types";
import {
  astToSyntaxTree,
  constructionStepsToVisualSteps,
} from "@/components/regular-expression/engine-adapters";
import {
  createInitialAutomataState,
  describeAutomataState,
  putAutomaton,
  type AutomataAgentState,
} from "@/features/automata-agent/lib/automaton-engine-agent";
import type { SubsetConstruction } from "@/features/automata-agent/lib/subset-construction-agent";
import type { RegularExpressionModel } from "@/features/regular-expression/model";
import type { ThompsonConstruction } from "@/features/regular-expression/thompson";

export type RegularExpressionAgentState = {
  activeCanvasId: string | null;
  expressionVersion: number;
  expression: RegularExpressionModel | null;
  view: RegularExpressionViewState;
  construction: ThompsonConstruction | null;
  constructionVersion: number | null;
  conversion: SubsetConstruction | null;
  conversionVersion: number | null;
  currentConversionStep: number;
  automata: AutomataAgentState;
  /** Generated automata only. Authored unrelated automata are never invalidated. */
  automatonVersions: Record<string, number>;
};

export type RegularExpressionAgentError = {
  code:
    | "REGULAR_EXPRESSION_NOT_FOUND"
    | "INVALID_REGULAR_EXPRESSION"
    | "AST_NODE_NOT_FOUND"
    | "CONSTRUCTION_NOT_FOUND"
    | "CONVERSION_NOT_FOUND"
    | "AUTOMATON_NOT_FOUND"
    | "INVALID_AUTOMATON"
    | "NOT_NFA"
    | "STEP_OUT_OF_RANGE"
    | "STALE_STATE"
    | "EXECUTION_ERROR";
  message: string;
  details?: Record<string, unknown>;
};

export function createInitialRegularExpressionAgentState(
  canvasId: string | null = null,
): RegularExpressionAgentState {
  return {
    activeCanvasId: canvasId,
    expressionVersion: 0,
    expression: null,
    view: {
      displayMode: "expression",
      currentConstructionStep: 0,
      currentInputIndex: 0,
      executionStatus: "idle",
      result: "unknown",
      showGeneratedAutomaton: false,
    },
    construction: null,
    constructionVersion: null,
    conversion: null,
    conversionVersion: null,
    currentConversionStep: 0,
    automata: createInitialAutomataState(canvasId),
    automatonVersions: {},
  };
}

function removeGeneratedAutomata(
  state: RegularExpressionAgentState,
): AutomataAgentState {
  const automata = structuredClone(state.automata);
  const generatedIds = new Set(Object.keys(state.automatonVersions));

  for (const id of generatedIds) {
    delete automata.automata[id];
    delete automata.executions[id];
  }
  automata.automatonOrder = automata.automatonOrder.filter(
    (id) => !generatedIds.has(id),
  );
  if (
    automata.selectedAutomatonId &&
    generatedIds.has(automata.selectedAutomatonId)
  ) {
    automata.selectedAutomatonId = automata.automatonOrder[0] ?? null;
  }
  return automata;
}

/** Replace expression truth and invalidate every artifact derived from it. */
export function replaceRegularExpression(
  state: RegularExpressionAgentState,
  expression: RegularExpressionModel,
): RegularExpressionAgentState {
  const version = state.expressionVersion + 1;
  const input = state.view.input ?? "";

  return {
    ...structuredClone(state),
    expressionVersion: version,
    expression: structuredClone(expression),
    construction: null,
    constructionVersion: null,
    conversion: null,
    conversionVersion: null,
    currentConversionStep: 0,
    automata: removeGeneratedAutomata(state),
    automatonVersions: {},
    view: {
      expression: expression.source,
      displayMode: "expression",
      syntaxTree: astToSyntaxTree(expression.root),
      selectedExpressionNodeId: null,
      highlightedExpressionNodeIds: [],
      selectedSyntaxTreeNodeId: null,
      highlightedSyntaxTreeNodeIds: [],
      highlightedSyntaxTreeSubtreeIds: [],
      activeSyntaxTreeNodeId: null,
      constructionSteps: [],
      currentConstructionStep: 0,
      input,
      inputSymbols: [...input],
      currentInputIndex: 0,
      executionStatus: "idle",
      result: "unknown",
      showGeneratedAutomaton: false,
      generatedAutomaton: null,
      generatedAutomatonExecution: null,
      sourceAutomaton: null,
      sourceAutomatonExecution: null,
      generatedDfa: null,
      generatedDfaExecution: null,
      conversionPlaybackActive: false,
      currentConversionStep: 0,
      conversionStepCount: 0,
    },
  };
}

export function putRegularExpressionAutomaton(
  state: RegularExpressionAgentState,
  automaton: Automaton,
  input = state.view.input ?? "",
): RegularExpressionAgentState {
  const next = structuredClone(state);
  next.automata = putAutomaton(next.automata, automaton, input);
  next.automatonVersions[automaton.id] = next.expressionVersion;
  return syncSelectedAutomatonView(next);
}

export function selectedRegularExpressionAutomaton(
  state: RegularExpressionAgentState,
): Automaton | null {
  const id = state.automata.selectedAutomatonId;
  return id ? (state.automata.automata[id] ?? null) : null;
}

export function selectedRegularExpressionExecution(
  state: RegularExpressionAgentState,
): AutomatonExecution | null {
  const automaton = selectedRegularExpressionAutomaton(state);
  return automaton ? (state.automata.executions[automaton.id] ?? null) : null;
}

export function isCurrentExpressionAutomaton(
  state: RegularExpressionAgentState,
  automatonId: string,
) {
  return state.automatonVersions[automatonId] === state.expressionVersion;
}

export function syncSelectedAutomatonView(
  state: RegularExpressionAgentState,
): RegularExpressionAgentState {
  const next = structuredClone(state);
  const automaton = selectedRegularExpressionAutomaton(next);
  const execution = selectedRegularExpressionExecution(next);

  next.view.showGeneratedAutomaton = Boolean(automaton);
  next.view.generatedAutomaton = automaton;
  next.view.generatedAutomatonExecution = execution;
  if (execution) {
    next.view.input = execution.input;
    next.view.currentInputIndex = execution.inputIndex;
    next.view.executionStatus = execution.status;
    next.view.result = execution.result;
  }
  return next;
}

export function applyConstruction(
  state: RegularExpressionAgentState,
  construction: ThompsonConstruction,
): RegularExpressionAgentState {
  const next = putRegularExpressionAutomaton(
    state,
    construction.automaton,
    state.view.input ?? "",
  );
  // Rebuilding the NFA invalidates a DFA derived from its earlier graph.
  const previousDfaId = state.conversion?.automaton.id;
  if (previousDfaId && state.automatonVersions[previousDfaId] !== undefined) {
    delete next.automata.automata[previousDfaId];
    delete next.automata.executions[previousDfaId];
    delete next.automatonVersions[previousDfaId];
    next.automata.automatonOrder = next.automata.automatonOrder.filter(
      (id) => id !== previousDfaId,
    );
  }
  next.construction = structuredClone(construction);
  next.constructionVersion = next.expressionVersion;
  next.conversion = null;
  next.conversionVersion = null;
  next.currentConversionStep = 0;
  next.view.displayMode = "construction";
  next.view.constructionSteps = constructionStepsToVisualSteps(
    construction.trace,
  );
  next.view.currentConstructionStep = 0;
  next.view.sourceAutomaton = construction.automaton;
  next.view.sourceAutomatonExecution = null;
  next.view.generatedDfa = null;
  next.view.generatedDfaExecution = null;
  next.view.conversionPlaybackActive = false;
  next.view.currentConversionStep = 0;
  next.view.conversionStepCount = 0;
  return next;
}

export function applyConversion(
  state: RegularExpressionAgentState,
  conversion: SubsetConstruction,
): RegularExpressionAgentState {
  const source = state.automata.automata[conversion.sourceAutomatonId];
  const next = putRegularExpressionAutomaton(
    state,
    conversion.automaton,
    state.view.input ?? "",
  );
  next.conversion = structuredClone(conversion);
  next.conversionVersion = next.expressionVersion;
  next.currentConversionStep = 0;
  next.view.displayMode = "expression";
  next.view.sourceAutomaton = source ?? null;
  next.view.sourceAutomatonExecution = null;
  next.view.generatedDfa = conversion.automaton;
  next.view.generatedDfaExecution = null;
  next.view.conversionPlaybackActive = true;
  next.view.highlightedExpressionNodeIds = [];
  next.view.highlightedSyntaxTreeNodeIds = [];
  next.view.activeSyntaxTreeNodeId = null;
  next.view.currentConversionStep = 0;
  next.view.conversionStepCount = 0;
  return next;
}

export function describeRegularExpressionAgentState(
  state: RegularExpressionAgentState,
) {
  if (!state.expression) {
    return "No regular expression is loaded.";
  }

  const selected = selectedRegularExpressionAutomaton(state);
  return [
    `expression "${state.expression.source}" (version ${state.expressionVersion})`,
    `alphabet {${state.expression.alphabet.join(", ")}}`,
    `AST root ${state.expression.root.id}`,
    state.constructionVersion === state.expressionVersion
      ? `Thompson construction ready with ${state.construction?.trace.length ?? 0} steps`
      : "Thompson construction not generated",
    state.conversionVersion === state.expressionVersion
      ? `DFA conversion ready with ${state.conversion?.trace.length ?? 0} steps`
      : "DFA conversion not generated",
    selected
      ? `active automaton ${selected.id} (${selected.type.toUpperCase()})`
      : "no active generated automaton",
    describeAutomataState(state.automata),
  ].join("; ");
}
