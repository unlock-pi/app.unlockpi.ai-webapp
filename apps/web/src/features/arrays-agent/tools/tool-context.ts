import {
  createInitialAgentState,
  describeAgentState,
} from "@/features/arrays-agent/lib/array-types";
import type { AnimationSpeed } from "@/features/arrays-agent/lib/array-types";
import type {
  ArrayAgentState,
  ArrayOpResult,
  ArrayValue,
  Complexity,
} from "@/features/arrays-agent/lib/array-types";

/** Supporting material shown beside the strip, never inside it. */
export type ArrayOverlay =
  | { kind: "explanation"; title: string; content: string }
  | { kind: "complexity"; operation: string; complexity: Complexity }
  | { kind: "steps"; title: string; steps: string[] }
  | {
      kind: "comparison";
      title: string;
      rows: Array<{
        algorithm: string;
        comparisons: number;
        swaps: number;
        steps: number;
        complexity: Complexity;
      }>;
    }
  | { kind: "quiz"; question: string; answer: string; choices?: string[] };

/**
 * Everything a tool is allowed to do to the world.
 *
 * Tools never touch React state or the canvas document directly — they read
 * `state` and call these. That keeps all 35 of them pure enough to test, and
 * means the same tool set drives the voice agent, a text chat, or a demo page
 * by swapping the context.
 */
export type ArrayToolContext = {
  /** Authoritative state. Tools resolve "the second element" against THIS. */
  readonly state: ArrayAgentState;
  /** Commit an operation: its values become the new truth, its frames animate. */
  play: (result: ArrayOpResult) => void;
  /** Create or replace the array block on the canvas, adding a frame if needed. */
  ensureArray: (values: ArrayValue[], name?: string) => void;
  /** Update non-array state: teaching topic, current algorithm, index visibility. */
  patch: (partial: {
    showIndices?: boolean;
    name?: string;
    dimensions?: number[];
    selectedIndex?: number | null;
    topic?: string | null;
    algorithm?: string | null;
    speed?: AnimationSpeed;
  }) => void;
  /** Show supporting material beside the strip. */
  overlay: (overlay: ArrayOverlay) => void;
  /** Clear highlights and overlays, keeping the array. */
  resetCanvas: () => void;
  /** Remove the array and everything around it. */
  clearCanvas: () => void;
  /**
   * Play the last operation's animation again, optionally at a different
   * speed. This is how "that was too fast, show me again slowly" works
   * without re-running the operation and changing the array a second time.
   */
  replayLast: (speed?: AnimationSpeed) => { ok: boolean; message: string };
  /**
   * Frame navigation, present only when the agent is running inside the
   * presenter. Absent on surfaces with no frames (the demo page), where the
   * navigation tools report that there is nothing to navigate rather than
   * disappearing — the model is offered a stable tool list either way.
   */
  presentation?: PresentationControls;
  /**
   * Editing the frame's own blocks. Present only on a canvas; absent on a
   * standalone board, where the block tools report that rather than failing.
   */
  blocks?: BlockControls;
  /**
   * Working with more than one array at a time. Canvas-only: a frame is what
   * holds several array blocks side by side.
   */
  combine?: CombineControls;
};

export type CombineControls = {
  /** Every array block on the frame, in the order they are laid out. */
  list: () => Array<{ blockId: string; name: string; values: string[] }>;
  /**
   * Add another array block to the frame. Returns its name, or null when the
   * frame has no room — deliberately NOT spilling onto a new frame, because
   * arrays being combined have to be visible together.
   */
  addArray: (values: string[], name?: string) => string | null;
  /**
   * Create (or reuse) the block the result goes into, and point the animation
   * at it. Returns its name, or null when the frame is full.
   */
  useResult: (name?: string) => string | null;
};

export type BlockControls = {
  add: (input: {
    type: "heading" | "subheading" | "body" | "code";
    text?: string;
    code?: string;
    language?: string;
    explanation?: string;
  }) => string;
  update: (
    target: "heading" | "subheading" | "body" | "frame_title",
    text: string,
  ) => string;
  remove: (target: "heading" | "subheading" | "body" | "code" | "array") => string;
  /** Add a code block mirroring the array, and keep it in sync from now on. */
  linkCode: (language: string) => string;
  /** Read an array literal back out of the frame's code block. */
  readCodeArray: () => { name: string | null; values: string[] } | null;
  /** Remove the code block, leaving the array. */
  hideCode: () => string;
  /** Whether a code block is currently tracking the array. */
  isCodeVisible: () => boolean;
  /** Remove every block from the frame now showing. */
  clearFrame: () => string;
  /**
   * Add a frame after the one showing and move to it. `copyCurrent` duplicates
   * the current frame's blocks instead of starting empty.
   */
  addFrame: (options: { title?: string; copyCurrent?: boolean }) => string;
};

export type PresentationControls = {
  /** Every call returns a one-line description of the frame now on screen. */
  next: () => string;
  previous: () => string;
  first: () => string;
  last: () => string;
  goTo: (frameNumber: number) => string;
  find: (query: string) => string;
  describe: () => string;
};

/** What every tool returns to the model. */
export type ArrayToolOutcome = {
  ok: boolean;
  summary: string;
  /** One-line snapshot of the array, so the model never has to guess. */
  state: string;
  complexity?: Complexity;
  meta?: Record<string, unknown>;
  /** Present only in slow mode: the beats to talk through as they play. */
  narration?: {
    playing_slowly: true;
    steps: string[];
    instruction: string;
  };
};

/**
 * Standard way to finish a tool that ran an operation: commit it, then report
 * the resulting state. `rejected` results are reported as `ok: false` with the
 * reason, so the model explains the refusal instead of retrying it.
 */
export function commit(
  ctx: ArrayToolContext,
  result: ArrayOpResult,
): ArrayToolOutcome {
  ctx.play(result);
  return {
    ok: !result.rejected,
    summary: result.summary,
    state: describeAgentState(ctx.state),
    complexity: result.complexity,
    meta: result.meta,
    ...narrationFor(ctx, result),
  };
}

/** How many beats the model is given to narrate in slow mode. */
const MAX_NARRATION_STEPS = 14;

/**
 * In slow mode the animation IS the lesson, so the model gets the beats it is
 * about to play and is told to talk through them. In normal mode it only gets
 * the summary — sending a hundred beats every time would refill the context
 * window we just freed up, to narrate something already over.
 */
function narrationFor(
  ctx: ArrayToolContext,
  result: ArrayOpResult,
): Pick<ArrayToolOutcome, "narration"> {
  if (ctx.state.teaching.speed !== "slow" || result.rejected) return {};
  const notes = result.frames
    .map((frame) => frame.note.trim())
    .filter((note, index, all) => note && note !== all[index - 1]);
  if (notes.length < 2) return {};

  const kept =
    notes.length <= MAX_NARRATION_STEPS
      ? notes
      : [
          // Keep both ends: how it starts and how it ends are the parts a
          // class needs, and the middle of a long sort is repetitive.
          ...notes.slice(0, MAX_NARRATION_STEPS - 4),
          `… ${notes.length - MAX_NARRATION_STEPS} more steps …`,
          ...notes.slice(-3),
        ];

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
  ctx: ArrayToolContext,
  summary: string,
  extra: Partial<ArrayToolOutcome> = {},
): ArrayToolOutcome {
  return {
    ok: true,
    summary,
    state: describeAgentState(ctx.state),
    ...extra,
  };
}

export function fail(
  ctx: ArrayToolContext,
  summary: string,
): ArrayToolOutcome {
  return { ok: false, summary, state: describeAgentState(ctx.state) };
}

/**
 * A context that does nothing, for when the tool set is built only to read its
 * schemas — the server route that mints the Realtime session needs the
 * parameter definitions but must never execute anything.
 */
export function createSchemaOnlyContext(): ArrayToolContext {
  return {
    state: createInitialAgentState(),
    play: () => {},
    ensureArray: () => {},
    patch: () => {},
    overlay: () => {},
    resetCanvas: () => {},
    clearCanvas: () => {},
    replayLast: () => ({ ok: false, message: "" }),
  };
}
