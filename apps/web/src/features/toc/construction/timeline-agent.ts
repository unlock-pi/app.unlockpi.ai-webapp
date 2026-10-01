/** Renderer- and voice-provider-independent semantic teaching timeline. */
export type TeachingAction =
  | { type: "create_state"; stateId: string }
  | { type: "set_initial_state"; stateId: string }
  | { type: "set_accepting_state"; stateId: string }
  | { type: "create_transition"; transitionId: string }
  | { type: "highlight_state"; stateId: string }
  | { type: "highlight_transition"; transitionId: string }
  | { type: "animate_transition"; transitionId: string }
  | { type: "execute_step"; stepIndex: number }
  | { type: "explain" }
  | { type: "pause" }
  | { type: "complete" };

export type TeachingStep<A = TeachingAction> = {
  id: string;
  action: A;
  narration: string;
  animationMs?: number;
};

export type TeachingTimelineState<A = TeachingAction> = {
  mode: "idle" | "preparing" | "building" | "paused" | "complete" | "error";
  steps: TeachingStep<A>[];
  currentStep: number;
  token: string | null;
  animation: "idle" | "running" | "complete";
  narration: "idle" | "speaking" | "complete";
  error?: string;
};

export type NarrationPort<A> = {
  prepare: (step: TeachingStep<A>, token: string) => void;
  cancel: (token: string) => void;
};

/** No clock guesses: only explicit, matching lifecycle acknowledgements advance. */
export class TeachingTimeline<A = TeachingAction> {
  private state: TeachingTimelineState<A> = {
    mode: "idle", steps: [], currentStep: 0, token: null,
    animation: "idle", narration: "idle",
  };
  private sequence = 0;
  private initialStep = 0;
  private automatic = true;
  constructor(private port: NarrationPort<A>, private publish: (state: TeachingTimelineState<A>) => void) {}

  snapshot() { return structuredClone(this.state); }
  private emit() { this.publish(this.snapshot()); }

  load(steps: TeachingStep<A>[], initialStep = 0) {
    if (!Number.isInteger(initialStep) || initialStep < 0 || initialStep > steps.length) throw new Error("Invalid initial timeline cursor.");
    if (new Set(steps.map((step) => step.id)).size !== steps.length) throw new Error("Construction step IDs must be unique.");
    this.cancelActive();
    this.initialStep = initialStep;
    this.state = { mode: "paused", steps: structuredClone(steps), currentStep: initialStep, token: null, animation: "idle", narration: "idle" };
    this.emit();
  }

  updateNarration(stepId: string, text: string) {
    const index = this.state.steps.findIndex((step) => step.id === stepId);
    if (index < this.state.currentStep || index < 0 || (index === this.state.currentStep && this.state.token)) throw new Error("Only pending narration can be changed.");
    this.state.steps[index].narration = text;
    this.emit();
  }

  resume(automatic = true) {
    if (this.state.mode === "building" || this.state.mode === "preparing") return;
    this.automatic = automatic;
    this.begin();
  }

  private begin() {
    const step = this.state.steps[this.state.currentStep];
    if (!step) {
      this.state.mode = "complete";
      this.state.token = null;
      this.emit();
      return;
    }
    const token = `${step.id}:${++this.sequence}`;
    this.state = { ...this.state, mode: "preparing", token, animation: "idle", narration: "idle", error: undefined };
    this.emit();
    try { this.port.prepare(step, token); }
    catch (error) { this.fail(token, error instanceof Error ? error.message : "Narration could not start."); }
  }

  narrationStarted(token: string) {
    if (token !== this.state.token || this.state.mode !== "preparing") return;
    this.state.mode = "building";
    this.state.animation = "running";
    this.state.narration = "speaking";
    this.emit();
  }

  animationCompleted(token: string) {
    if (token !== this.state.token || this.state.mode !== "building") return;
    if (this.state.animation === "complete") return;
    this.state.animation = "complete";
    this.finishIfReady();
  }

  narrationCompleted(token: string) {
    if (token !== this.state.token || this.state.mode !== "building") return;
    if (this.state.narration === "complete") return;
    this.state.narration = "complete";
    this.finishIfReady();
  }

  private finishIfReady() {
    if (this.state.animation !== "complete" || this.state.narration !== "complete") { this.emit(); return; }
    const completed = this.state.steps[this.state.currentStep]?.action;
    if (completed && typeof completed === "object" && "type" in completed && completed.type === "pause") this.automatic = false;
    this.state.currentStep += 1;
    this.state.token = null;
    this.state.mode = "paused";
    this.emit();
    if (this.automatic) this.begin();
  }

  private cancelActive() {
    const token = this.state.token;
    this.state.token = null;
    if (token) this.port.cancel(token);
  }

  pause() {
    if (this.state.mode === "idle" || this.state.mode === "complete") return;
    this.cancelActive();
    this.state.mode = "paused";
    this.state.animation = "idle";
    this.state.narration = "idle";
    this.emit();
  }

  undo() {
    this.pause();
    this.state.currentStep = Math.max(this.initialStep, this.state.currentStep - 1);
    this.state.mode = "paused";
    this.emit();
  }

  reset() {
    this.pause();
    this.state.currentStep = this.initialStep;
    this.state.mode = "paused";
    this.state.error = undefined;
    this.emit();
  }

  clear() {
    this.cancelActive();
    this.state = { mode: "idle", steps: [], currentStep: 0, token: null, animation: "idle", narration: "idle" };
    this.emit();
  }

  fail(token: string, message: string) {
    if (token !== this.state.token) return;
    this.cancelActive();
    this.state.mode = "error";
    this.state.error = message;
    this.state.animation = "idle";
    this.state.narration = "idle";
    this.emit();
  }
}
