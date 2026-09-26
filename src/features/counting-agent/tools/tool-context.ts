import {
  createInitialAgentState,
  describeAgentState,
} from "@/features/counting-agent/lib/counting-types";
import type {
  AnimationSpeed,
  CountingAgentState,
  CountingOpResult,
} from "@/features/counting-agent/lib/counting-types";
import type { TextHighlightMark } from "@/features/canvas/types/canvas-types";

/** Supporting material shown beside the strip, never inside it. */
export type CountingOverlay =
  | { kind: "explanation"; title: string; content: string }
  | { kind: "quiz"; question: string; answer: string; choices?: string[] };

/**
 * Everything a tool is allowed to do to the world. Mirrors `ArrayToolContext`
 * — tools never touch React state or the canvas document directly, they read
 * `state` and call these.
 */
export type CountingToolContext = {
  /** Authoritative state. */
  readonly state: CountingAgentState;
  /** Commit an operation: its final frame becomes the new truth. */
  play: (result: CountingOpResult) => void;
  /** Update non-strip state: teaching topic, speed. */
  patch: (partial: { topic?: string | null; speed?: AnimationSpeed }) => void;
  /** Show supporting material beside the strip. */
  overlay: (overlay: CountingOverlay) => void;
  /** Clear highlights, division and overlays, keeping the strip's size and order. */
  resetCanvas: () => void;
  /** Remove the strip and everything around it. */
  clearCanvas: () => void;
  /** Play the last operation's animation again, optionally at a different speed. */
  replayLast: (speed?: AnimationSpeed) => { ok: boolean; message: string };
  /** Frame navigation, present only when running inside the presenter. */
  presentation?: PresentationControls;
  /** Editing the frame's own blocks, present only on a canvas. */
  blocks?: BlockControls;
};

export type BlockControls = {
  add: (input: { type: "heading" | "subheading" | "body"; text?: string }) => string;
  update: (target: "heading" | "subheading" | "body" | "frame_title", text: string) => string;
  remove: (target: "heading" | "subheading" | "body" | "strip") => string;
  clearFrame: () => string;
  addFrame: (options: { title?: string; copyCurrent?: boolean }) => string;
  /** Mark specific words/phrases inside a text block with the highlight tool. */
  highlight: (
    target: "heading" | "subheading" | "body",
    marks: TextHighlightMark[],
  ) => string;
  /** Remove every highlight mark from a text block. */
  clearHighlights: (target: "heading" | "subheading" | "body") => string;
};

export type PresentationControls = {
  next: () => string;
  previous: () => string;
  first: () => string;
  last: () => string;
  goTo: (frameNumber: number) => string;
  find: (query: string) => string;
  describe: () => string;
};

/** What every tool returns to the model. */
export type CountingToolOutcome = {
  ok: boolean;
  summary: string;
  /** One-line snapshot of the strip, so the model never has to guess. */
  state: string;
  meta?: Record<string, unknown>;
  narration?: {
    playing_slowly: true;
    steps: string[];
    instruction: string;
  };
};

/**
 * Standard way to finish a tool that ran an operation: commit it, then report
 * the resulting state.
 */
export function commit(
  ctx: CountingToolContext,
  result: CountingOpResult,
): CountingToolOutcome {
  ctx.play(result);
  return {
    ok: !result.rejected,
    summary: result.summary,
    state: describeAgentState(ctx.state),
    meta: result.meta,
    ...narrationFor(ctx, result),
  };
}

const MAX_NARRATION_STEPS = 14;

function narrationFor(
  ctx: CountingToolContext,
  result: CountingOpResult,
): Pick<CountingToolOutcome, "narration"> {
  if (ctx.state.teaching.speed !== "slow" || result.rejected) return {};
  const notes = result.frames
    .map((frame) => frame.note.trim())
    .filter((note, index, all) => note && note !== all[index - 1]);
  if (notes.length < 2) return {};

  const kept =
    notes.length <= MAX_NARRATION_STEPS
      ? notes
      : [...notes.slice(0, MAX_NARRATION_STEPS - 4), `… ${notes.length - MAX_NARRATION_STEPS} more steps …`, ...notes.slice(-3)];

  return {
    narration: {
      playing_slowly: true,
      steps: kept.map((note) => note.slice(0, 90)),
      instruction:
        "This is playing slowly on screen right now. Talk the class through these steps in order, in your own words, while they watch. Do not call another tool until you have finished.",
    },
  };
}

/** Finish a tool that changed presentation rather than data. */
export function report(
  ctx: CountingToolContext,
  summary: string,
  extra: Partial<CountingToolOutcome> = {},
): CountingToolOutcome {
  return { ok: true, summary, state: describeAgentState(ctx.state), ...extra };
}

export function fail(ctx: CountingToolContext, summary: string): CountingToolOutcome {
  return { ok: false, summary, state: describeAgentState(ctx.state) };
}

/**
 * A context that does nothing, for when the tool set is built only to read
 * its schemas — the server route that mints the Realtime session needs the
 * parameter definitions but must never execute anything.
 */
export function createSchemaOnlyContext(): CountingToolContext {
  return {
    state: createInitialAgentState(),
    play: () => {},
    patch: () => {},
    overlay: () => {},
    resetCanvas: () => {},
    clearCanvas: () => {},
    replayLast: () => ({ ok: false, message: "" }),
  };
}
