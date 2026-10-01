import {
  describeRegularExpressionAgentState,
  type RegularExpressionAgentState,
} from "@/features/regular-expression-agent/lib/agent-state-agent";

export function buildRegularExpressionLiveContext(
  state: RegularExpressionAgentState,
) {
  return [
    "LIVE CONTEXT — authoritative current regular-expression state. Trust this over conversational memory.",
    describeRegularExpressionAgentState(state),
    `Available generated automata: ${state.automata.automatonOrder.join(", ") || "none"}.`,
    "Use inspect_regular_expression before any operation that depends on exact AST node IDs or current generated artifacts.",
  ].join("\n");
}
