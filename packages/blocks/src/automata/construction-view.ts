import type { AutomatonExecution } from "./model";

// The renderer only needs this part of the app's teaching timeline.
type ConstructionAction =
  | { type: "create_state" | "set_initial_state" | "set_accepting_state" | "highlight_state"; stateId: string }
  | { type: "create_transition" | "highlight_transition" | "animate_transition"; transitionId: string }
  | { type: "execute_step"; stepIndex: number }
  | { type: "explain" | "pause" | "complete" };

export type AutomataConstructionView = {
  execution?: AutomatonExecution;
  automatonId: string;
  timeline: {
    mode: "idle" | "preparing" | "building" | "paused" | "complete" | "error";
    steps: { action: ConstructionAction; animationMs?: number; narration?: string }[];
    currentStep: number;
    token: string | null;
    animation: "idle" | "running" | "complete";
    error?: string;
  };
  visibleStates: string[];
  visibleTransitions: string[];
  initialState: string | null;
  acceptingStates: string[];
  highlightedStates: string[];
  highlightedTransitions: string[];
};
