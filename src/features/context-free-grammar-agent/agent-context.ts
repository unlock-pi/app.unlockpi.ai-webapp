import { describeContextFreeGrammarAgentState, type ContextFreeGrammarAgentState } from "@/features/context-free-grammar-agent/agent-state";

export function buildContextFreeGrammarLiveContext(state: ContextFreeGrammarAgentState) {
  return [
    "LIVE CONTEXT — authoritative CFG state. Trust this over conversational memory.",
    describeContextFreeGrammarAgentState(state),
    "Available grammars: " + (state.grammarOrder.join(", ") || "none") + ".",
    "Inspect a grammar before using exact production or parse-tree node IDs.",
  ].join("\n");
}
