/**
 * Core vocabulary for the Arrays agent.
 *
 * Every array operation — create, insert, delete, search, traverse, sort —
 * returns the SAME shape: a list of `ArrayFrame` beats. A frame is a complete
 * snapshot of what the strip should look like at one moment, so the player
 * never has to know which operation produced it. That is what lets twenty-odd
 * operations and five sorting algorithms drive one renderer.
 */

/** Canvas array cells are strings; numeric ops coerce on the way in. */
export type ArrayValue = string;

export type Complexity = {
  time: string;
  space: string;
  /** Why it is that complexity, in one classroom-ready sentence. */
  reason: string;
};

/**
 * One beat of an animation: a full snapshot, not a delta. Deltas would force
 * the player to replay history to know the current state; snapshots let it
 * seek, pause, and resume anywhere.
 */
export type ArrayFrame = {
  values: ArrayValue[];
  /** Cells under active examination — the compared pair, the probe, the slot. */
  active: number[];
  /** Cells already looked at and rejected — rendered dim. */
  visited: number[];
  /** Cells proven to be in final position — rendered settled. */
  settled: number[];
  /** The cell that answers the question: a search hit, the inserted slot. */
  found?: number;
  /** A labelled pointer under one cell, e.g. `{ index: 3, label: "pivot" }`. */
  marker?: { index: number; label: string };
  /**
   * A value currently lifted OUT of the array — insertion sort's held element,
   * or merge sort's buffered value. Without this the strip briefly shows the
   * same number twice (the copy and the original) and reads as a rendering
   * bug; showing what is in hand makes the duplicate legible as a copy.
   */
  held?: { value: string; label: string };
  /** One short line explaining this beat. */
  note: string;
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
    animationEnabled: boolean;
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
    teaching: { topic: null, algorithm: null, animationEnabled: true },
  };
}

/** Compact state description sent back to the model after every tool call. */
export function describeAgentState(state: ArrayAgentState): string {
  const { array, teaching } = state;
  return JSON.stringify({
    array: {
      name: array.name,
      values: array.values,
      length: array.values.length,
      dimensions: array.dimensions,
      selected_index: array.selectedIndex,
      show_indices: array.showIndices,
    },
    teaching: {
      topic: teaching.topic,
      algorithm: teaching.algorithm,
      animation_enabled: teaching.animationEnabled,
    },
  });
}
