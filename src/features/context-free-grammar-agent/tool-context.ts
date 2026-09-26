import type { ContextFreeGrammarBlockProps } from "@/components/context-free-grammar/types";
import {
  createInitialContextFreeGrammarAgentState,
  describeContextFreeGrammarAgentState,
  type ContextFreeGrammarAgentState,
} from "@/features/context-free-grammar-agent/agent-state";
import type { GrammarError } from "@/features/context-free-grammar/grammar-engine";

export type GrammarCommitChange =
  | { kind: "create"; grammarId: string; props: ContextFreeGrammarBlockProps }
  | { kind: "update"; grammarId: string; props: ContextFreeGrammarBlockProps }
  | { kind: "select"; grammarId: string };

export type GrammarToolContext = {
  readonly state: ContextFreeGrammarAgentState;
  commit: (next: ContextFreeGrammarAgentState, change?: GrammarCommitChange) => Promise<GrammarError | null> | GrammarError | null | void;
};

export type GrammarToolOutcome =
  | { success: true; ok: true; operation: string; summary: string; state: string; data?: unknown }
  | { success: false; ok: false; operation: string; summary: string; state: string; error: GrammarError };

export function succeed(ctx: GrammarToolContext, operation: string, summary: string, data?: unknown): GrammarToolOutcome {
  return { success: true, ok: true, operation, summary, state: describeContextFreeGrammarAgentState(ctx.state), ...(data === undefined ? {} : { data }) };
}
export function fail(ctx: GrammarToolContext, operation: string, error: GrammarError): GrammarToolOutcome {
  return { success: false, ok: false, operation, summary: error.message, state: describeContextFreeGrammarAgentState(ctx.state), error };
}
export function createSchemaOnlyContext(): GrammarToolContext {
  return { state: createInitialContextFreeGrammarAgentState(), commit: () => null };
}
