/**
 * Core vocabulary for the Arrays agent.
 *
 * Every array operation — create, insert, delete, search, traverse, sort —
 * returns the SAME shape: a list of `ArrayFrame` beats. A frame is a complete
 * snapshot of what the strip should look like at one moment, so the player
 * never has to know which operation produced it. That is what lets twenty-odd
 * operations and five sorting algorithms drive one renderer.
 *
 * `ArrayFrame` and `ArrayValue` are re-exported here for convenience — this
 * file is the one-stop import for the agent's vocabulary — but they are NOT
 * defined here. Their real home is
 * `@/components/data-structure/array/array-frame`: that shape belongs to the
 * array component, not to this feature, because a pre-authored lesson or any
 * other future producer of frames needs the exact same contract without
 * depending on the agent.
 */
import type { ArrayFrame, ArrayValue } from "@/components/data-structure/array/array-frame";

export type { ArrayFrame, ArrayValue };

/**
 * How an operation plays out.
 *
 * `normal` paces the whole operation into a classroom-sized moment, which
 * means a long sort races past — fine for "show me the result", useless for
 * "help me follow it". `slow` gives every beat the same, generous time so a
 * quicksort can actually be read; `instant` skips straight to the result.
 */
export type AnimationSpeed = "instant" | "normal" | "slow";

export type Complexity = {
  time: string;
  space: string;
  /** Why it is that complexity, in one classroom-ready sentence. */
  reason: string;
};

/** What every array tool hands back to the executor. */
export type ArrayOpResult = {
  values: ArrayValue[];
  frames: ArrayFrame[];
  /** Plain-language result for the model to speak. */
  summary: string;
  complexity?: Complexity;
  /** Operation-specific extras: foundIndex, comparisons, swaps, removed value. */
  meta?: Record<string, unknown>;
  /**
   * The operation declined to run (out of bounds, non-numeric, at capacity).
   * `values` is unchanged and `summary` says why — the model should relay the
   * reason rather than retry.
   */
  rejected?: boolean;
};

// ── Sorting: one interface, five algorithms ─────────────────────────────

export type SortOrder = "ascending" | "descending";

export type SortOptions = {
  order: SortOrder;
  animate?: boolean;
  showSteps?: boolean;
};

export type SortStepKind =
  | "compare"
  | "swap"
  | "overwrite"
  | "settle"
  | "pivot";

export type SortStep = {
  kind: SortStepKind;
  /** Cells this step touches. `compare` and `swap` carry exactly two. */
  indices: number[];
  /** Full array snapshot after the step. */
  values: number[];
  /** Value lifted out of the array while this step runs. See `ArrayFrame.held`. */
  held?: { value: string; label: string };
  note: string;
};

export type SortResult = {
  algorithm: string;
  original: number[];
  sorted: number[];
  steps: SortStep[];
  comparisons: number;
  swaps: number;
};

/** Signature every sorting algorithm implements. */
export type SortAlgorithm = (input: number[], options: SortOptions) => SortResult;

// ── Agent state ────────────────────────────────────────────────────────

/**
 * The agent's authoritative view of the world. Tools read and write THIS —
 * never whatever the model happens to remember from the conversation. When the
 * teacher says "remove the second element", this is what "second" resolves
 * against.
 */
export type ArrayAgentState = {
  activeCanvasId: string | null;
  /** Frame (slide) the array block currently lives on. */
  activeFrameId: string | null;
  array: {
    /** Canvas block id, null until a block exists. */
    id: string | null;
    name: string;
    values: ArrayValue[];
    /** Rows/cols for a 2-D array; a flat array is `[values.length]`. */
    dimensions: number[];
    selectedIndex: number | null;
    showIndices: boolean;
  };
  teaching: {
    topic: string | null;
    algorithm: string | null;
    /** How fast operations animate. See `AnimationSpeed`. */
    speed: AnimationSpeed;
  };
};

export function createInitialAgentState(
  canvasId: string | null = null,
): ArrayAgentState {
  return {
    activeCanvasId: canvasId,
    activeFrameId: null,
    array: {
      id: null,
      name: "A",
      values: [],
      dimensions: [0],
      selectedIndex: null,
      showIndices: true,
    },
    teaching: { topic: null, algorithm: null, speed: "normal" },
  };
}

/**
 * One-line state description sent back to the model after every tool call.
 *
 * It rides along on EVERY tool result, so it has to be small: the previous
 * multi-field JSON was repeated dozens of times per class and ate the context
 * window the conversation itself needed.
 */
export function describeAgentState(state: ArrayAgentState): string {
  const { array } = state;
  if (array.values.length === 0) return "No array on the board.";

  const grid =
    array.dimensions.length === 2
      ? ` as a ${array.dimensions[0]}x${array.dimensions[1]} grid`
      : "";
  const selected =
    array.selectedIndex === null ? "" : `, index ${array.selectedIndex} selected`;
  return `${array.name} = [${array.values.join(", ")}] (${array.values.length} elements${grid}${selected})`;
}
