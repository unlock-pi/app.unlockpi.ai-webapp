import type {
  ArrayFrame,
  ArrayValue,
  Complexity,
} from "@/features/arrays-agent/lib/array-types";

/**
 * Hard cap so a voice command can never blow past the fixed 16:9 frame.
 * Ten cells is what stays readable from the back of a room at presentation
 * scale; beyond that the strip shrinks faster than it teaches.
 */
export const MAX_ARRAY_LENGTH = 10;

/**
 * Cells are a fixed square, so a long value has to fit rather than widen the
 * strip. Past this many characters the display is truncated (the full value
 * stays in the data and in the cell's tooltip).
 */
export const MAX_VALUE_DISPLAY_CHARS = 9;

/** Shortens one value for display only — never changes what is stored. */
export function truncateValue(value: string): string {
  return value.length > MAX_VALUE_DISPLAY_CHARS
    ? `${value.slice(0, MAX_VALUE_DISPLAY_CHARS - 1)}…`
    : value;
}

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
    note,
  };
}

export function toDisplayValues(values: Array<string | number>): ArrayValue[] {
  return values.map((value) => String(value).trim());
}

/**
 * Coerce the strip to numbers for ops that need ordering (sorts, binary
 * search). Returns null when any cell is not numeric, so the caller can say
 * *why* it refused instead of silently sorting `NaN`s.
 */
export function toNumeric(values: ArrayValue[]): number[] | null {
  const numbers = values.map((value) => Number(value));
  return numbers.some((value) => !Number.isFinite(value)) ? null : numbers;
}

export function isSortedAscending(values: number[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1] <= value);
}

/** Bounds check that reports the valid range, since the model needs to relay it. */
export function indexError(index: number, length: number): string | null {
  if (!Number.isInteger(index)) return `Index ${index} is not a whole number.`;
  if (length === 0) return "The array is empty, so there is no index to use.";
  if (index < 0 || index >= length) {
    return `Index ${index} is out of bounds — valid indices are 0 to ${length - 1}.`;
  }
  return null;
}

export const COMPLEXITY: Record<string, Complexity> = {
  create_array: {
    time: "O(n)",
    space: "O(n)",
    reason: "Every element is written once into a freshly allocated block.",
  },
  access_by_index: {
    time: "O(1)",
    space: "O(1)",
    reason:
      "The address is computed arithmetically from the base and the index, so no searching happens.",
  },
  traverse_array: {
    time: "O(n)",
    space: "O(1)",
    reason: "Each element is visited exactly once and nothing extra is stored.",
  },
  insert_at_beginning: {
    time: "O(n)",
    space: "O(1)",
    reason: "Every existing element shifts one slot right to free index 0.",
  },
  insert_at_end: {
    time: "O(1)",
    space: "O(1)",
    reason: "The new value lands in the next free slot; nothing moves.",
  },
  insert_at_index: {
    time: "O(n)",
    space: "O(1)",
    reason: "Elements from the insertion point onward each shift one slot right.",
  },
  sorted_insert: {
    time: "O(n)",
    space: "O(1)",
    reason: "Finding the slot is O(n) and shifting the tail is O(n).",
  },
  delete_from_beginning: {
    time: "O(n)",
    space: "O(1)",
    reason: "Every remaining element shifts one slot left to close the gap.",
  },
  delete_from_end: {
    time: "O(1)",
    space: "O(1)",
    reason: "The last slot is simply released; nothing shifts.",
  },
  delete_at_index: {
    time: "O(n)",
    space: "O(1)",
    reason: "Elements after the removed slot each shift one place left.",
  },
  linear_search: {
    time: "O(n)",
    space: "O(1)",
    reason: "In the worst case every element is compared before the answer is known.",
  },
  binary_search: {
    time: "O(log n)",
    space: "O(1)",
    reason: "Each comparison discards half of the remaining range.",
  },
  bubble_sort: {
    time: "O(n²)",
    space: "O(1)",
    reason: "Each of n passes compares up to n neighbouring pairs, swapping in place.",
  },
  selection_sort: {
    time: "O(n²)",
    space: "O(1)",
    reason: "Each pass scans the unsorted tail to find its minimum — always n²/2 comparisons.",
  },
  insertion_sort: {
    time: "O(n²)",
    space: "O(1)",
    reason: "Each new element may shift past every already-sorted element before it.",
  },
  merge_sort: {
    time: "O(n log n)",
    space: "O(n)",
    reason: "log n levels of halving, each merging all n elements through a temporary buffer.",
  },
  quick_sort: {
    time: "O(n log n) average, O(n²) worst",
    space: "O(log n)",
    reason:
      "A good pivot halves the range each time; a bad one peels off a single element per pass.",
  },
};
