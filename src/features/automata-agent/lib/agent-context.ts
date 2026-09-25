import {
  describeAutomataState,
  type AutomataAgentState,
} from "@/features/automata-agent/lib/automaton-engine";

export function buildAutomataLiveContext(state: AutomataAgentState) {
  return [
    "LIVE CONTEXT — authoritative current automata state. Trust this over conversational memory.",
    describeAutomataState(state),
    `Available automata: ${state.automatonOrder.join(", ") || "none"}.`,
    "Use inspect_automaton whenever exact states or transitions matter.",
  ].join("\n");
}
