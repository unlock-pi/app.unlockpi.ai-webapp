import type { Automaton } from "@/components/automata/model";
import type { ThompsonConstruction } from "@/features/regular-expression/thompson";
import type { SubsetConstruction } from "@/features/automata-agent/lib/subset-construction";
import type { TeachingStep } from "@/features/toc/construction/timeline";

/** Domain engines remain unchanged; their existing traces become semantic actions. */
function builder(automaton: Automaton) {
  const steps: TeachingStep[] = [];
  const created = new Set<string>();
  const state = (stateId: string, explanation: string) => {
    if (created.has(stateId)) return;
    created.add(stateId);
    steps.push({ id: `state:${stateId}`, action: { type: "create_state", stateId }, narration: explanation });
    if (automaton.startState === stateId) steps.push({ id: `initial:${stateId}`, action: { type: "set_initial_state", stateId }, narration: "Mark this as the initial state." });
    if (automaton.acceptStates.includes(stateId)) steps.push({ id: `accept:${stateId}`, action: { type: "set_accepting_state", stateId }, narration: "Mark this as an accepting state." });
  };
  const transition = (transitionId: string, explanation: string) => {
    const edge = automaton.transitions.find((candidate) => candidate.id === transitionId);
    if (!edge) throw new Error("Trace references an unknown transition.");
    state(edge.from, `Create state ${edge.from}.`);
    state(edge.to, `Create state ${edge.to}.`);
    steps.push({ id: `edge:${transitionId}`, action: { type: "create_transition", transitionId }, narration: explanation });
  };
  return { steps, state, transition };
}

export function timelineFromThompson(result: ThompsonConstruction): TeachingStep[] {
  const plan = builder(result.automaton);
  for (const operation of result.trace) {
    plan.steps.push({ id: `operation:${operation.id}`, action: { type: "explain" }, narration: operation.description });
    for (const id of operation.createdStateIds) plan.state(id, `Create state ${id} for this fragment.`);
    for (const id of operation.createdTransitionIds) {
      const edge = result.automaton.transitions.find((candidate) => candidate.id === id)!;
      plan.transition(id, `Connect ${edge.from} to ${edge.to} with ${edge.symbols.join(" or ")}.`);
    }
  }
  return plan.steps;
}

export function timelineFromSubsetConstruction(result: SubsetConstruction): TeachingStep[] {
  const plan = builder(result.automaton);
  const initial = result.automaton.startState;
  plan.state(initial, `The initial epsilon closure is {${result.stateSets[initial].join(", ")}}. Create its DFA state.`);
  for (const step of result.trace) {
    plan.steps.push({ id: `subset:${step.step}`, action: { type: "explain" }, narration: `On ${step.symbol}, the move is {${step.moveResult.join(", ")}}, and its epsilon closure is {${step.epsilonClosure.join(", ")}}.` });
    plan.state(step.resultingDfaStateId, `Create the state for subset {${step.epsilonClosure.join(", ")}}.`);
    plan.transition(step.createdTransitionId, `Add the ${step.symbol} transition to that subset.`);
  }
  return plan.steps;
}
