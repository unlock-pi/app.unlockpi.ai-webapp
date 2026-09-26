import type { Automaton } from "@/components/automata/model";
import type { ThompsonConstruction } from "@/features/regular-expression/thompson";
import type { SubsetConstruction } from "@/features/automata-agent/lib/subset-construction";
import type { TeachingStep } from "@/features/toc/construction/timeline";
/** Reveal a connected graph from its start state without changing the final layout. */
export function timelineFromAutomaton(automaton: Automaton): TeachingStep[] {
  const start = automaton.states.find((state) => state.id === automaton.startState);
  if (!start) throw new Error("The automaton has no valid start state.");

  const steps: TeachingStep[] = [];
  const createdStates = new Set<string>();
  const createdTransitions = new Set<string>();
  const queue: string[] = [];

  const addState = (stateId: string) => {
    if (createdStates.has(stateId)) return;
    const state = automaton.states.find((candidate) => candidate.id === stateId);
    if (!state) throw new Error(`Unknown state ${stateId}.`);
    createdStates.add(stateId);
    queue.push(stateId);
    steps.push({
      id: `state:${stateId}`, action: { type: "create_state", stateId },
      narration: `Create ${state.label}.`, animationMs: 850,
    });
    if (stateId === automaton.startState) {
      steps.push({
        id: `initial:${stateId}`, action: { type: "set_initial_state", stateId },
        narration: `Mark ${state.label} as the start state.`, animationMs: 650,
      });
    }
    if (automaton.acceptStates.includes(stateId)) {
      steps.push({
        id: `accept:${stateId}`, action: { type: "set_accepting_state", stateId },
        narration: `Mark ${state.label} as accepting.`, animationMs: 650,
      });
    }
  };
  const addOutgoing = () => {
    while (queue.length) {
      const from = queue.shift()!;
      // Prefer paths to new states before self-loops, so the graph grows outward.
      const outgoing = automaton.transitions
        .filter((edge) => edge.from === from)
        .sort((left, right) => Number(left.to === from) - Number(right.to === from));
      for (const edge of outgoing) {
        if (createdTransitions.has(edge.id)) continue;
        addState(edge.to);
        createdTransitions.add(edge.id);
        steps.push({
          id: `edge:${edge.id}`,
          action: { type: "create_transition", transitionId: edge.id },
          narration: `Draw ${edge.from} → ${edge.to} on ${edge.symbols.join(", ")}.`,
          animationMs: 1_150,
        });
      }
    }
  };

  addState(start.id);
  addOutgoing();
  // Keep disconnected but authored states and their transitions visible too.
  for (const state of automaton.states) {
    if (createdStates.has(state.id)) continue;
    addState(state.id);
    addOutgoing();
  }
  return steps;
}

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
