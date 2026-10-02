import type { Automaton, AutomataConstructionView } from "@unlockpi/blocks/automata";
import type { TeachingStep, TeachingTimelineState } from "./timeline";

export function constructionView(automatonId: string, timeline: TeachingTimelineState): AutomataConstructionView {
  const view: AutomataConstructionView = { automatonId, timeline, visibleStates: [], visibleTransitions: [], initialState: null, acceptingStates: [], highlightedStates: [], highlightedTransitions: [] };
  const count = timeline.currentStep + (timeline.mode === "building" ? 1 : 0);
  for (const step of timeline.steps.slice(0, count)) {
    const action = step.action;
    if (action.type === "create_state") view.visibleStates.push(action.stateId);
    if (action.type === "create_transition") view.visibleTransitions.push(action.transitionId);
    if (action.type === "set_initial_state") view.initialState = action.stateId;
    if (action.type === "set_accepting_state") view.acceptingStates.push(action.stateId);
  }
  const action = timeline.steps[timeline.currentStep]?.action;
  if (timeline.mode === "building" && action) {
    if ("stateId" in action) view.highlightedStates = [action.stateId];
    if ("transitionId" in action) view.highlightedTransitions = [action.transitionId];
  }
  return view;
}

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

