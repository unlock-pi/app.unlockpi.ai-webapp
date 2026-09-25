import type { Automaton } from "@/components/automata/model";
import {
  createInitialAutomataState,
  describeAutomataState,
  type AutomataAgentState,
  type AutomatonEngineError,
} from "@/features/automata-agent/lib/automaton-engine";

export type AutomataCommit = {
  definitionChanged?: Automaton;
  created?: Automaton;
};

export type AutomataToolContext = {
  readonly state: AutomataAgentState;
  commit: (state: AutomataAgentState, change?: AutomataCommit) => void;
};

export type AutomataToolSuccess = {
  success: true;
  ok: true;
  summary: string;
  state: string;
  data?: unknown;
};

export type AutomataToolFailure = {
  success: false;
  ok: false;
  summary: string;
  state: string;
  error: AutomatonEngineError;
};

export type AutomataToolOutcome = AutomataToolSuccess | AutomataToolFailure;

export function succeed(
  ctx: AutomataToolContext,
  summary: string,
  data?: unknown,
): AutomataToolSuccess {
  return {
    success: true,
    ok: true,
    summary,
    state: describeAutomataState(ctx.state),
    ...(data === undefined ? {} : { data }),
  };
}

export function fail(
  ctx: AutomataToolContext,
  error: AutomatonEngineError,
): AutomataToolFailure {
  return {
    success: false,
    ok: false,
    summary: error.message,
    state: describeAutomataState(ctx.state),
    error,
  };
}

export function createSchemaOnlyContext(): AutomataToolContext {
  return {
    state: createInitialAutomataState(),
    commit: () => {},
  };
}
