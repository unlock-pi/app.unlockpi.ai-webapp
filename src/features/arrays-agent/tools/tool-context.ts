import {
  createInitialAgentState,
  describeAgentState,
} from "@/features/arrays-agent/lib/array-types";
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
    animationEnabled?: boolean;
  }) => void;
  /** Show supporting material beside the strip. */
  overlay: (overlay: ArrayOverlay) => void;
  /** Clear highlights and overlays, keeping the array. */
  resetCanvas: () => void;
  /** Remove the array and everything around it. */
  clearCanvas: () => void;
  /**
   * Frame navigation, present only when the agent is running inside the
   * presenter. Absent on surfaces with no frames (the demo page), where the
   * navigation tools report that there is nothing to navigate rather than
   * disappearing — the model is offered a stable tool list either way.
   */
  presentation?: PresentationControls;
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
  /** JSON snapshot of authoritative state, so the model never has to guess. */
  state: string;
  complexity?: Complexity;
  meta?: Record<string, unknown>;
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
  };
}
