/**
 * The array's animation contract — owned by the UI, not by any one feature.
 *
 * This is the canonical answer to "what does one moment of the array look
 * like": a full snapshot, never a delta. Deltas would force whatever plays
 * these back to replay history to know the current state; snapshots let it
 * seek, pause, and resume anywhere. `ArrayView` renders one of these; nothing
 * that PRODUCES them — a live voice agent, a pre-authored lesson, anything
 * else later — needs to know how another producer works, only that it hands
 * back frames shaped like this one.
 *
 * `arrays-agent` builds on top of this (its `ArrayOpResult` wraps a list of
 * these frames plus teaching copy); it does not own this type. If you're
 * adding a new source of frames, import from here, not from arrays-agent.
 */

/** One array cell's content. Numeric input is coerced to this on the way in. */
export type ArrayValue = string;

export type ArrayFrame = {
  values: ArrayValue[];
  /**
   * The ONE cell the eye should be on (two only when a sort compares a pair).
   * Never more: a beat that lights up several cells gives the class nowhere
   * to look.
   */
  active: number[];
  /** Cells ruled out by a search or sort — rendered dim. Nothing else uses it. */
  visited: number[];
  /**
   * Cells that are final: sorted into place, or a result. Never used to mean
   * "untouched" — an insert's prefix is simply left neutral.
   */
  settled: number[];
  /** The cell that answers the question: a search hit. Rendered green. */
  found?: number;
  /** A labelled pointer under one cell, e.g. `{ index: 3, label: "pivot" }`. */
  marker?: { index: number; label: string };
  /**
   * A POSITION rather than a value: "insert here", "remove this one". Drawn
   * under the index row, because the question an insert or delete answers is
   * which index, not which value happens to be sitting there.
   */
  caret?: { index: number; label?: string };
  /**
   * An empty slot inside `values` (its value is a placeholder). `ArrayView`
   * draws it as a hole and keys it as a new cell, so the real elements slide
   * around it instead of their values morphing in place.
   */
  gap?: number;
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

/**
 * Hard cap so a producer can never blow past what `ArrayView` can lay out
 * inside a fixed 16:9 frame. Ten cells is what stays readable from the back
 * of a room at presentation scale; beyond that the strip shrinks faster than
 * it teaches. This is a rendering constraint that business logic (an insert
 * refusing once full, say) defers to — the cap lives here so that's the
 * right way around, not the other one.
 */
export const MAX_ARRAY_LENGTH = 10;

/**
 * Cells are a fixed square, so a long value has to fit rather than widen the
 * strip. Past this many characters the display is truncated (the full value
 * stays in the data and in the cell's tooltip).
 */
export const MAX_VALUE_DISPLAY_CHARS = 9;

/** Shortens one value for display only — never changes what is stored. */
export function truncateValue(value: string | number): string {
  const text = String(value);
  return text.length > MAX_VALUE_DISPLAY_CHARS
    ? `${text.slice(0, MAX_VALUE_DISPLAY_CHARS - 1)}…`
    : text;
}

/** Build one frame. `overrides` covers everything except `values`/`note`, which every frame needs explicitly. */
export function frame(
  values: ArrayValue[],
  note: string,
  overrides: Partial<Omit<ArrayFrame, "values" | "note">> = {},
): ArrayFrame {
  return {
    values: [...values],
    active: overrides.active ?? [],
    visited: overrides.visited ?? [],
    settled: overrides.settled ?? [],
    found: overrides.found,
    marker: overrides.marker,
    held: overrides.held,
    caret: overrides.caret,
    gap: overrides.gap,
    note,
  };
}
