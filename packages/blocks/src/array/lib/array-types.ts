/**
 * Vocabulary shared by every array operation — create, insert, delete,
 * search, traverse, sort. Every operation returns the SAME shape
 * (`ArrayOpResult`, wrapping a list of `ArrayFrame` beats from
 * `array-frame.ts`), which is what lets one player and one renderer run all
 * of them without knowing which operation produced a given result.
 *
 * This is the array concept's OWN vocabulary — not the agent's. What the
 * agent additionally tracks (`ArrayAgentState`: which canvas block, which
 * frame, teaching mode) stays in `apps/web/src/features/arrays-agent/lib/`,
 * since a pre-authored lesson or any future producer of array operations has
 * no notion of a canvas or a voice session and shouldn't need one to use
 * these types.
 */
import type { ArrayFrame, ArrayValue } from "./array-frame";

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

/** What every array operation hands back to its caller. */
export type ArrayOpResult = {
  values: ArrayValue[];
  frames: ArrayFrame[];
  /** Plain-language result, for a caption or a model to speak. */
  summary: string;
  complexity?: Complexity;
  /** Operation-specific extras: foundIndex, comparisons, swaps, removed value. */
  meta?: Record<string, unknown>;
  /**
   * The operation declined to run (out of bounds, non-numeric, at capacity).
   * `values` is unchanged and `summary` says why — a caller should relay the
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
