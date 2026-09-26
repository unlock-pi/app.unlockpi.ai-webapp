import {
  createInitialRegularExpressionAgentState,
  describeRegularExpressionAgentState,
  type RegularExpressionAgentError,
  type RegularExpressionAgentState,
} from "@/features/regular-expression-agent/lib/agent-state";

export type RegularExpressionCommit = {
  expressionChanged?: {
    expression: string;
    input: string;
  };
};

export type RegularExpressionToolContext = {
  readonly state: RegularExpressionAgentState;
  commit: (
    state: RegularExpressionAgentState,
    change?: RegularExpressionCommit,
  ) => void;
};

export type RegularExpressionToolSuccess = {
  success: true;
  ok: true;
  operation: string;
  summary: string;
  state: string;
  data?: unknown;
};

export type RegularExpressionToolFailure = {
  success: false;
  ok: false;
  operation: string;
  summary: string;
  state: string;
  error: RegularExpressionAgentError;
};

export type RegularExpressionToolOutcome =
  RegularExpressionToolSuccess | RegularExpressionToolFailure;

export function succeed(
  ctx: RegularExpressionToolContext,
  operation: string,
  summary: string,
  data?: unknown,
): RegularExpressionToolSuccess {
  return {
    success: true,
    ok: true,
    operation,
    summary,
    state: describeRegularExpressionAgentState(ctx.state),
    ...(data === undefined ? {} : { data }),
  };
}

export function fail(
  ctx: RegularExpressionToolContext,
  operation: string,
  error: RegularExpressionAgentError,
): RegularExpressionToolFailure {
  return {
    success: false,
    ok: false,
    operation,
    summary: error.message,
    state: describeRegularExpressionAgentState(ctx.state),
    error,
  };
}

export function createSchemaOnlyContext(): RegularExpressionToolContext {
  return {
    state: createInitialRegularExpressionAgentState(),
    commit: () => {},
  };
}
