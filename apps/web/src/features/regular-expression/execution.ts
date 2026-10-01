import {
  createAutomatonExecution,
  epsilonClosureWithTransitions,
  isEpsilon,
  stepAutomaton,
  tokenizeAutomatonInput,
  type Automaton,
  type AutomatonExecution,
  type ExecutionResult,
  type ExecutionStatus,
} from "@/packages/blocks/automata/model";
import type {
  RegularExpressionAst,
  RegularExpressionModel,
} from "@/features/regular-expression/model";
import {
  parseRegularExpression,
  type RegularExpressionParseError,
} from "@/features/regular-expression/parser";
import {
  constructEpsilonNFA,
  type ThompsonConstruction,
  type ThompsonConstructionError,
} from "@/features/regular-expression/thompson";

export type EpsilonNfaExecutionError = {
  code: "INVALID_AUTOMATON" | "UNKNOWN_SYMBOL";
  message: string;
  inputIndex?: number;
  symbol?: string;
};

export type EpsilonNfaExecutionTraceStep = {
  step: number;
  inputIndex: number;
  consumedSymbol: string | null;
  activeStateIds: string[];
  movedStateIds: string[];
  epsilonClosureStateIds: string[];
  traversedTransitionIds: string[];
  consumedSymbols: string[];
  remainingSymbols: string[];
  status: ExecutionStatus;
  result: ExecutionResult;
};

export type EpsilonNfaExecution = {
  execution: AutomatonExecution;
  inputSymbols: string[];
  trace: EpsilonNfaExecutionTraceStep[];
  accepted?: boolean;
  error?: EpsilonNfaExecutionError;
};

export type RegularExpressionEvaluation = {
  construction: ThompsonConstruction;
  execution: EpsilonNfaExecution;
  accepted?: boolean;
};

export type RegularExpressionEvaluationResult =
  | { success: true; value: RegularExpressionEvaluation }
  | { success: false; error: ThompsonConstructionError };

export type SourceEvaluationResult =
  | { success: true; value: RegularExpressionEvaluation }
  | {
      success: false;
      error:
        | { code: "PARSE_ERROR"; message: string; parseErrors: RegularExpressionParseError[] }
        | ThompsonConstructionError;
    };

function executionError(execution: AutomatonExecution): EpsilonNfaExecutionError | undefined {
  if (execution.status !== "error") return undefined;
  const match = execution.error?.match(/Input symbol "(.+)" is not in the alphabet\./);
  return match
    ? {
        code: "UNKNOWN_SYMBOL",
        message: execution.error as string,
        inputIndex: execution.inputIndex,
        symbol: match[1],
      }
    : {
        code: "INVALID_AUTOMATON",
        message: execution.error ?? "The automaton is invalid.",
      };
}

/** Creates reset execution state without changing or recreating the automaton. */
export function createEpsilonNFAExecution(
  automaton: Automaton,
  input = "",
): EpsilonNfaExecution {
  const execution = createAutomatonExecution(automaton, input);
  const inputSymbols = tokenizeAutomatonInput(automaton, input);
  const initialClosure = automaton.states.some(
    (state) => state.id === automaton.startState,
  )
    ? epsilonClosureWithTransitions(automaton, [automaton.startState])
    : { states: [], transitions: [] };

  return {
    execution,
    inputSymbols,
    trace: [
      {
        step: 0,
        inputIndex: 0,
        consumedSymbol: null,
        activeStateIds: [...initialClosure.states],
        movedStateIds: [automaton.startState].filter(Boolean),
        epsilonClosureStateIds: [...initialClosure.states],
        traversedTransitionIds: [...initialClosure.transitions],
        consumedSymbols: [],
        remainingSymbols: [...inputSymbols],
        status: execution.status,
        result: execution.result,
      },
    ],
    error: executionError(execution),
  };
}

/** Advances one input symbol by delegating formal stepping to the automata model. */
export function stepEpsilonNFA(
  automaton: Automaton,
  current: EpsilonNfaExecution,
): EpsilonNfaExecution {
  if (["accepted", "rejected", "error"].includes(current.execution.status)) {
    return current;
  }

  const before = current.execution;
  const execution = stepAutomaton(automaton, current.inputSymbols, before);
  const automatonStep = execution.steps.length > before.steps.length
    ? execution.steps.at(-1)
    : undefined;
  const consumedSymbol = current.inputSymbols[before.inputIndex] ?? null;
  const consumedCount = consumedSymbol === null
    ? before.inputIndex
    : execution.status === "error"
      ? before.inputIndex
      : before.inputIndex + 1;
  const traversedTransitions = automatonStep?.transitions ?? [];
  const movedStateIds = [
    ...new Set(
      automaton.transitions
        .filter(
          (transition) =>
            traversedTransitions.includes(transition.id) &&
            transition.symbols.some((symbol) => !isEpsilon(symbol)),
        )
        .map((transition) => transition.to),
    ),
  ];
  const activeStateIds = automatonStep?.toStates ?? before.currentStates;
  const error = executionError(execution);
  const traceStep: EpsilonNfaExecutionTraceStep = {
    step: current.trace.length,
    inputIndex: consumedCount,
    consumedSymbol,
    activeStateIds: [...activeStateIds],
    movedStateIds,
    epsilonClosureStateIds: [...activeStateIds],
    traversedTransitionIds: [...traversedTransitions],
    consumedSymbols: current.inputSymbols.slice(0, consumedCount),
    remainingSymbols: current.inputSymbols.slice(consumedCount),
    status: execution.status,
    result: execution.result,
  };

  return {
    execution,
    inputSymbols: current.inputSymbols,
    trace: [...current.trace, traceStep],
    accepted:
      execution.status === "accepted"
        ? true
        : execution.status === "rejected"
          ? false
          : undefined,
    error,
  };
}

/** Executes a DFA/NFA-compatible epsilon-NFA and returns playback-ready trace data. */
export function executeEpsilonNFA(
  automaton: Automaton,
  input: string,
): EpsilonNfaExecution {
  let state = createEpsilonNFAExecution(automaton, input);
  if (state.execution.status === "error") return state;

  const maximumSteps = Math.max(1, state.inputSymbols.length);
  for (let index = 0; index < maximumSteps; index++) {
    state = stepEpsilonNFA(automaton, state);
    if (["accepted", "rejected", "error"].includes(state.execution.status)) {
      break;
    }
  }
  return state;
}

export function resetEpsilonNFAExecution(
  automaton: Automaton,
  current: EpsilonNfaExecution,
  input = current.execution.input,
): EpsilonNfaExecution {
  return createEpsilonNFAExecution(automaton, input);
}

/** Validates, constructs, and evaluates an existing AST or RE model. */
export function evaluateRegularExpression(
  expression: RegularExpressionAst | RegularExpressionModel,
  input: string,
  automatonId = "regex-nfa",
): RegularExpressionEvaluationResult {
  const root = "root" in expression ? expression.root : expression;
  const construction = constructEpsilonNFA(root, automatonId);
  if (!construction.success) return construction;

  const execution = executeEpsilonNFA(construction.value.automaton, input);
  return {
    success: true,
    value: {
      construction: construction.value,
      execution,
      accepted: execution.accepted,
    },
  };
}

/** Parses source text, constructs its epsilon-NFA, and evaluates the input. */
export function evaluateRegularExpressionSource(
  source: string,
  input: string,
  automatonId = "regex-nfa",
): SourceEvaluationResult {
  const parsed = parseRegularExpression(source);
  if (!parsed.ok) {
    return {
      success: false,
      error: {
        code: "PARSE_ERROR",
        message: parsed.errors[0]?.message ?? "The regular expression is invalid.",
        parseErrors: parsed.errors,
      },
    };
  }
  return evaluateRegularExpression(parsed.value, input, automatonId);
}
