import type { Automaton, AutomatonExecution } from "@/components/automata/model";
import { validateAutomaton } from "@/components/automata/model";
import type { TeachingStep, TeachingTimelineState } from "@/features/toc/construction/timeline";

export type AutomataConstructionView = {
  execution?: AutomatonExecution;
  automatonId: string;
  timeline: TeachingTimelineState;
  visibleStates: string[];
  visibleTransitions: string[];
  initialState: string | null;
  acceptingStates: string[];
  highlightedStates: string[];
  highlightedTransitions: string[];
};

/** Validate the entire plan before publishing or changing an authored block. */
export function validateConstructionPlan(automaton: Automaton, steps: TeachingStep[]) {
  const validation = validateAutomaton(automaton);
  if (!validation.valid) throw new Error(validation.issues.map((issue) => issue.message).join(" "));
  const states = new Set<string>();
  const transitions = new Set<string>();
  let initial = "";
  const accepting = new Set<string>();
  if (!steps.length || new Set(steps.map((step) => step.id)).size !== steps.length) throw new Error("Supply a non-empty timeline with unique step IDs.");
  for (const step of steps) {
    const action = step.action;
    if ("stateId" in action && !automaton.states.some((state) => state.id === action.stateId)) throw new Error(`Unknown state ${action.stateId}.`);
    if (action.type === "create_state") {
      if (states.has(action.stateId)) throw new Error(`State ${action.stateId} is created twice.`);
      states.add(action.stateId);
    } else if ("stateId" in action && !states.has(action.stateId)) throw new Error("Create a state before marking or highlighting it.");
    if (action.type === "set_initial_state") {
      if (action.stateId !== automaton.startState) throw new Error("Initial-state action disagrees with the final automaton.");
      initial = action.stateId;
    }
    if (action.type === "set_accepting_state") {
      if (!automaton.acceptStates.includes(action.stateId)) throw new Error("Accepting-state action disagrees with the final automaton.");
      accepting.add(action.stateId);
    }
    if ("transitionId" in action) {
      const transition = automaton.transitions.find((edge) => edge.id === action.transitionId);
      if (!transition) throw new Error(`Unknown transition ${action.transitionId}.`);
      if (action.type === "create_transition") {
        if (!states.has(transition.from) || !states.has(transition.to)) throw new Error("Create both endpoints before their transition.");
        if (transitions.has(transition.id)) throw new Error("A transition is created twice.");
        transitions.add(transition.id);
      } else if (!transitions.has(transition.id)) throw new Error("Create a transition before explaining or traversing it.");
    }
  }
  if (states.size !== automaton.states.length || transitions.size !== automaton.transitions.length || initial !== automaton.startState || accepting.size !== automaton.acceptStates.length) throw new Error("The timeline must construct the entire declared automaton, including initial and accepting markings.");
}

/** Render partial visibility against the full graph so positions never jump. */
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
