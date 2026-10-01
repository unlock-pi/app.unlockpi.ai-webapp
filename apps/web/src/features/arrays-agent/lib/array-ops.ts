import {
  COMPLEXITY,
  MAX_ARRAY_LENGTH,
  frame,
  indexError,
  toDisplayValues,
  toNumeric,
} from "@/features/arrays-agent/lib/array-frames";
import type {
  ArrayOpResult,
  ArrayValue,
} from "@/features/arrays-agent/lib/array-types";

/** A refusal that still renders: no change, one frame explaining why. */
function refuse(values: ArrayValue[], summary: string): ArrayOpResult {
  return {
    values: [...values],
    frames: [frame(values, summary)],
    summary,
    rejected: true,
  };
}

// ── Creation ────────────────────────────────────────────────────────────

export function createArray(
  values: Array<string | number>,
  name = "A",
): ArrayOpResult {
  const next = toDisplayValues(values).slice(0, MAX_ARRAY_LENGTH);
  const dropped = values.length - next.length;

  return {
    values: next,
    frames: [
      frame(next, `Allocated ${name} with ${next.length} contiguous slots, addressed by index.`),
    ],
    summary:
      `Created ${name} = [${next.join(", ")}] with ${next.length} elements` +
      (dropped > 0
        ? `. ${dropped} value(s) were dropped — the frame holds at most ${MAX_ARRAY_LENGTH}.`
        : "."),
    complexity: COMPLEXITY.create_array,
  };
}

export function createEmptyArray(length: number, name = "A"): ArrayOpResult {
  const size = Math.max(0, Math.min(MAX_ARRAY_LENGTH, Math.round(length)));
  const next = Array.from({ length: size }, () => "");

  return {
    values: next,
    frames: [
      frame(next, `Reserved ${size} empty slots for ${name}.`),
    ],
    summary: `Created an empty array ${name} with ${size} slots. The slots exist but hold no values yet.`,
    complexity: COMPLEXITY.create_array,
  };
}

// ── Access ──────────────────────────────────────────────────────────────

export function accessArrayElement(
  values: ArrayValue[],
  index: number,
  name = "A",
): ArrayOpResult {
  const error = indexError(index, values.length);
  if (error) return refuse(values, error);

  return {
    values: [...values],
    frames: [
      frame(values, `${name}[${index}] — jump straight to index ${index}.`, {
        caret: { index },
      }),
      frame(values, `${name}[${index}] is ${values[index]}.`, {
        caret: { index },
        active: [index],
      }),
    ],
    summary: `${name}[${index}] is ${values[index]}. Access is O(1) — the address is computed, not searched for.`,
    complexity: COMPLEXITY.access_by_index,
    meta: { index, value: values[index] },
  };
}

// ── Traversal ───────────────────────────────────────────────────────────

export function traverseArray(values: ArrayValue[], name = "A"): ArrayOpResult {
  if (values.length === 0) return refuse(values, "The array is empty — nothing to traverse.");

  const frames = values.map((value, index) =>
    frame(values, `${name}[${index}] = ${value}`, {
      active: [index],
      visited: Array.from({ length: index }, (_, i) => i),
    }),
  );
  frames.push(
    frame(values, `Visited all ${values.length} elements, front to back.`, {
      visited: values.map((_, index) => index),
    }),
  );

  return {
    values: [...values],
    frames,
    summary: `Traversed ${name} front to back, visiting ${values.length} elements: ${values.join(", ")}.`,
    complexity: COMPLEXITY.traverse_array,
  };
}

export function traverseArrayReverse(
  values: ArrayValue[],
  name = "A",
): ArrayOpResult {
  if (values.length === 0) return refuse(values, "The array is empty — nothing to traverse.");

  const last = values.length - 1;
  const frames = values.map((_, step) => {
    const index = last - step;
    return frame(values, `${name}[${index}] = ${values[index]}`, {
      active: [index],
      visited: Array.from({ length: step }, (_, i) => last - i),
    });
  });
  frames.push(
    frame(values, `Visited all ${values.length} elements, back to front.`, {
      visited: values.map((_, index) => index),
    }),
  );

  return {
    values: [...values],
    frames,
    summary: `Traversed ${name} in reverse: ${[...values].reverse().join(", ")}.`,
    complexity: COMPLEXITY.traverse_array,
  };
}

/**
 * A 2-D traversal over the flat strip. The strip stays one row — `rows`/`cols`
 * only decide the visiting ORDER and the `[r][c]` narration, which is the part
 * that actually teaches row-major layout: a 2-D array is contiguous memory
 * read in row order, and showing it on one line is the honest picture.
 */
export function traverse2dArray(
  values: ArrayValue[],
  rows: number,
  cols: number,
  name = "A",
): ArrayOpResult {
  if (rows * cols !== values.length) {
    return refuse(
      values,
      `A ${rows}x${cols} grid needs ${rows * cols} elements but the array has ${values.length}.`,
    );
  }

  const frames: ArrayOpResult["frames"] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      frames.push(
        frame(values, `${name}[${row}][${col}] = ${values[index]} (flat index ${index})`, {
          active: [index],
          visited: Array.from({ length: index }, (_, i) => i),
        }),
      );
    }
  }
  frames.push(
    frame(values, `Row-major order: ${rows} rows of ${cols}, laid out end to end.`, {
      visited: values.map((_, index) => index),
    }),
  );

  return {
    values: [...values],
    frames,
    summary: `Traversed ${name} as a ${rows}x${cols} grid in row-major order. Flat index = row * ${cols} + column.`,
    complexity: { time: "O(r*c)", space: "O(1)", reason: "Every cell is visited exactly once." },
    meta: { rows, cols },
  };
}

export function accessMultidimensionalElement(
  values: ArrayValue[],
  row: number,
  col: number,
  cols: number,
  name = "A",
): ArrayOpResult {
  const index = row * cols + col;
  const error = indexError(index, values.length);
  if (error) return refuse(values, `${name}[${row}][${col}] is out of bounds. ${error}`);

  return {
    values: [...values],
    frames: [
      frame(values, `${name}[${row}][${col}] → flat index ${row} * ${cols} + ${col} = ${index}`, {
        active: [index],
      }),
      frame(values, `${name}[${row}][${col}] is ${values[index]}.`, {
        active: [index],
        found: index,
      }),
    ],
    summary: `${name}[${row}][${col}] is ${values[index]}, at flat index ${index}.`,
    complexity: COMPLEXITY.access_by_index,
    meta: { index, value: values[index] },
  };
}

export function updateMultidimensionalElement(
  values: ArrayValue[],
  row: number,
  col: number,
  cols: number,
  value: string,
  name = "A",
): ArrayOpResult {
  const index = row * cols + col;
  const error = indexError(index, values.length);
  if (error) return refuse(values, `${name}[${row}][${col}] is out of bounds. ${error}`);

  const previous = values[index];
  const next = [...values];
  next[index] = value;

  return {
    values: next,
    frames: [
      frame(values, `${name}[${row}][${col}] is flat index ${index}, currently ${previous}.`, {
        active: [index],
      }),
      frame(next, `Overwrote it with ${value} in place — no shifting needed.`, {
        active: [index],
        found: index,
      }),
    ],
    summary: `${name}[${row}][${col}] changed from ${previous} to ${value}.`,
    complexity: COMPLEXITY.access_by_index,
  };
}

// ── Insertion ───────────────────────────────────────────────────────────

/**
 * How a shift is drawn. By default the tail moves as ONE block — the class
 * sees "these elements move right" in a single motion. `stepwise` shows every
 * individual copy (the real memmove order) for slow mode, with the empty slot
 * visibly travelling so each copy is a cell moving, not a value morphing.
 */
export type ShiftOptions = { stepwise?: boolean };

/** Placeholder value of a gap slot. The strip draws `gap` as a hole, never this. */
const GAP = "";

/**
 * The shared insertion engine. One focus point per beat:
 *   1. the caret marks the index being inserted at,
 *   2. the tail slides right, leaving a gap at that index,
 *   3. the new value drops into the gap,
 *   4. everything returns to neutral.
 */
function insertAt(
  values: ArrayValue[],
  index: number,
  value: string,
  name: string,
  complexityKey: keyof typeof COMPLEXITY,
  opening: string,
  { stepwise = false }: ShiftOptions = {},
): ArrayOpResult {
  if (values.length >= MAX_ARRAY_LENGTH) {
    return refuse(
      values,
      `${name} already holds ${MAX_ARRAY_LENGTH} elements, the most this frame fits. Delete one first, or start a new array on a new frame.`,
    );
  }

  const shifted = values.length - index;
  const caret = { index, label: "insert" };
  const frames = [frame(values, opening, { caret })];

  if (shifted === 0) {
    frames.push(
      frame([...values, GAP], `Index ${index} is free — nothing has to move.`, {
        caret,
        gap: index,
      }),
    );
  } else if (!stepwise) {
    frames.push(
      frame(
        [...values.slice(0, index), GAP, ...values.slice(index)],
        `${shifted} element${shifted === 1 ? "" : "s"} shift one slot right to free index ${index}.`,
        { caret, gap: index },
      ),
    );
  } else {
    // Real memmove order: grow by one slot, then copy from the end backwards —
    // going forwards would overwrite values not yet copied. The gap walks left.
    const working = [...values, GAP];
    frames.push(
      frame(working, `Grow ${name} by one slot at the end.`, { caret, gap: values.length }),
    );
    for (let slot = values.length; slot > index; slot--) {
      working[slot] = working[slot - 1];
      working[slot - 1] = GAP;
      frames.push(
        frame(working, `Copy ${working[slot]} from index ${slot - 1} to index ${slot}.`, {
          caret,
          gap: slot - 1,
          active: [slot],
        }),
      );
    }
  }

  const next = [...values.slice(0, index), value, ...values.slice(index)];
  frames.push(
    frame(next, `Write ${value} into index ${index}.`, { caret: { index }, active: [index] }),
    frame(next, `${name} is now [${next.join(", ")}].`),
  );

  return {
    values: next,
    frames,
    summary: `Inserted ${value} at index ${index}. ${shifted} element(s) shifted right; ${name} is now [${next.join(", ")}].`,
    complexity: COMPLEXITY[complexityKey],
    meta: { index, value, shifted },
  };
}

export function insertAtBeginning(
  values: ArrayValue[],
  value: string,
  name = "A",
  options: ShiftOptions = {},
): ArrayOpResult {
  return insertAt(
    values,
    0,
    value,
    name,
    "insert_at_beginning",
    `To put ${value} at index 0, every existing element must move right first.`,
    options,
  );
}

export function insertAtEnd(
  values: ArrayValue[],
  value: string,
  name = "A",
  options: ShiftOptions = {},
): ArrayOpResult {
  return insertAt(
    values,
    values.length,
    value,
    name,
    "insert_at_end",
    `${value} goes at index ${values.length}, the next free slot.`,
    options,
  );
}

export function insertAtIndex(
  values: ArrayValue[],
  index: number,
  value: string,
  name = "A",
  options: ShiftOptions = {},
): ArrayOpResult {
  if (!Number.isInteger(index) || index < 0 || index > values.length) {
    return refuse(
      values,
      `Cannot insert at index ${index} — valid insertion points are 0 to ${values.length}.`,
    );
  }
  return insertAt(
    values,
    index,
    value,
    name,
    "insert_at_index",
    `${value} goes at index ${index}, so everything from there on shifts right.`,
    options,
  );
}

export function insertMultiple(
  values: ArrayValue[],
  index: number,
  newValues: Array<string | number>,
  name = "A",
  options: ShiftOptions = {},
): ArrayOpResult {
  const incoming = toDisplayValues(newValues);
  if (!Number.isInteger(index) || index < 0 || index > values.length) {
    return refuse(
      values,
      `Cannot insert at index ${index} — valid insertion points are 0 to ${values.length}.`,
    );
  }
  if (values.length + incoming.length > MAX_ARRAY_LENGTH) {
    return refuse(
      values,
      `Inserting ${incoming.length} values would take ${name} past ${MAX_ARRAY_LENGTH} elements, which will not fit this frame.`,
    );
  }

  let working = [...values];
  const frames = [
    frame(working, `Inserting ${incoming.length} values at index ${index}, one at a time.`, {
      caret: { index, label: "insert" },
    }),
  ];

  incoming.forEach((value, offset) => {
    const step = insertAt(
      working,
      index + offset,
      value,
      name,
      "insert_at_index",
      `Next up: ${value} at index ${index + offset}.`,
      options,
    );
    working = step.values;
    frames.push(...step.frames);
  });

  return {
    values: working,
    frames,
    summary: `Inserted ${incoming.join(", ")} starting at index ${index}. ${name} is now [${working.join(", ")}].`,
    complexity: {
      time: "O(n*k)",
      space: "O(1)",
      reason: "Each of the k inserted values shifts the tail of the array once.",
    },
  };
}

export function sortedInsert(
  values: ArrayValue[],
  value: string,
  name = "A",
  options: ShiftOptions = {},
): ArrayOpResult {
  const numbers = toNumeric(values);
  const incoming = Number(value);

  if (!numbers || !Number.isFinite(incoming)) {
    return refuse(
      values,
      "Sorted insert needs every element — and the new value — to be numeric.",
    );
  }

  const frames = [frame(values, `Scanning for the first element larger than ${value}.`)];
  let slot = numbers.length;
  for (let index = 0; index < numbers.length; index++) {
    if (numbers[index] > incoming) {
      slot = index;
      frames.push(
        frame(values, `${values[index]} > ${value} — so ${value} belongs at index ${index}.`, {
          active: [index],
          visited: Array.from({ length: index }, (_, i) => i),
        }),
      );
      break;
    }
    frames.push(
      frame(values, `${values[index]} ≤ ${value} — keep looking.`, {
        active: [index],
        visited: Array.from({ length: index }, (_, i) => i),
      }),
    );
  }

  const inserted = insertAt(
    values,
    slot,
    value,
    name,
    "sorted_insert",
    `Make room at index ${slot}.`,
    options,
  );
  if (inserted.rejected) return inserted;

  return {
    ...inserted,
    frames: [...frames, ...inserted.frames],
    summary: `Inserted ${value} at index ${slot}, keeping ${name} sorted: [${inserted.values.join(", ")}].`,
    complexity: COMPLEXITY.sorted_insert,
  };
}

// ── Deletion ────────────────────────────────────────────────────────────

/**
 * Mirror image of `insertAt`, one focus point per beat:
 *   1. the caret and focus mark the element being removed,
 *   2. it lifts out, leaving a gap,
 *   3. the tail slides left as a block to close it (stepwise: one copy at a
 *      time, the gap walking right), and the spare slot is released.
 */
function deleteAt(
  values: ArrayValue[],
  index: number,
  name: string,
  complexityKey: keyof typeof COMPLEXITY,
  opening: string,
  { stepwise = false }: ShiftOptions = {},
): ArrayOpResult {
  const error = indexError(index, values.length);
  if (error) return refuse(values, error);

  const removed = values[index];
  const shifted = values.length - index - 1;
  const caret = { index, label: "remove" };
  const working = [...values];
  working[index] = GAP;

  const frames = [
    frame(values, opening, { caret, active: [index] }),
    frame(working, `Take ${removed} out — index ${index} is now empty.`, { caret, gap: index }),
  ];

  if (stepwise) {
    for (let slot = index; slot < working.length - 1; slot++) {
      working[slot] = working[slot + 1];
      working[slot + 1] = GAP;
      frames.push(
        frame(working, `Copy ${working[slot]} from index ${slot + 1} into index ${slot}.`, {
          gap: slot + 1,
          active: [slot],
        }),
      );
    }
  }

  const next = values.filter((_, i) => i !== index);
  frames.push(
    frame(
      next,
      shifted === 0 || stepwise
        ? `Release the spare slot. ${name} now has ${next.length} elements.`
        : `${shifted} element${shifted === 1 ? "" : "s"} shift one slot left to close the gap.`,
    ),
  );

  return {
    values: next,
    frames,
    summary: `Removed ${removed} from index ${index}. ${shifted} element(s) shifted left; ${name} is now [${next.join(", ")}].`,
    complexity: COMPLEXITY[complexityKey],
    meta: { index, removed },
  };
}

export function deleteFromBeginning(
  values: ArrayValue[],
  name = "A",
  options: ShiftOptions = {},
): ArrayOpResult {
  if (values.length === 0) return refuse(values, `${name} is already empty.`);
  return deleteAt(
    values,
    0,
    name,
    "delete_from_beginning",
    `Removing index 0 leaves a hole at the front — everything after it shifts left.`,
    options,
  );
}

export function deleteFromEnd(
  values: ArrayValue[],
  name = "A",
  options: ShiftOptions = {},
): ArrayOpResult {
  if (values.length === 0) return refuse(values, `${name} is already empty.`);
  return deleteAt(
    values,
    values.length - 1,
    name,
    "delete_from_end",
    `The last element has nothing after it, so removing it shifts nothing.`,
    options,
  );
}

export function deleteAtIndex(
  values: ArrayValue[],
  index: number,
  name = "A",
  options: ShiftOptions = {},
): ArrayOpResult {
  return deleteAt(
    values,
    index,
    name,
    "delete_at_index",
    `Removing index ${index} leaves a hole — the tail shifts left to close it.`,
    options,
  );
}

export function deleteMultiple(
  values: ArrayValue[],
  indices: number[],
  name = "A",
  options: ShiftOptions = {},
): ArrayOpResult {
  const targets = [...new Set(indices)].sort((left, right) => right - left);
  const invalid = targets.find((index) => indexError(index, values.length) !== null);
  if (invalid !== undefined) {
    return refuse(values, indexError(invalid, values.length) ?? "Invalid index.");
  }
  if (targets.length === 0) return refuse(values, "No indices were given to delete.");

  let working = [...values];
  const frames = [
    frame(working, `Deleting indices ${[...targets].reverse().join(", ")} — highest first.`),
    // Highest-first matters: deleting a low index would renumber every target
    // above it, so the teacher's second index would hit the wrong element.
    frame(working, "Working from the highest index down keeps the lower indices valid."),
  ];

  targets.forEach((index) => {
    const step = deleteAt(
      working,
      index,
      name,
      "delete_at_index",
      `Now removing index ${index}.`,
      options,
    );
    working = step.values;
    frames.push(...step.frames);
  });

  return {
    values: working,
    frames,
    summary: `Deleted ${targets.length} element(s). ${name} is now [${working.join(", ")}].`,
    complexity: {
      time: "O(n*k)",
      space: "O(1)",
      reason: "Each of the k deletions shifts the remaining tail once.",
    },
  };
}

export function deleteByValue(
  values: ArrayValue[],
  value: string,
  removeAll: boolean,
  name = "A",
  options: ShiftOptions = {},
): ArrayOpResult {
  const matches = values.reduce<number[]>((found, current, index) => {
    if (current === value) found.push(index);
    return found;
  }, []);

  if (matches.length === 0) {
    return refuse(values, `${value} is not in ${name}, so there is nothing to remove.`);
  }

  const targets = removeAll ? matches : [matches[0]];
  const scan = values.map((current, index) =>
    frame(values, `Is ${current} equal to ${value}? ${current === value ? "Yes." : "No."}`, {
      active: [index],
      visited: Array.from({ length: index }, (_, i) => i),
      found: current === value ? index : undefined,
    }),
  );

  const removal = deleteMultiple(values, targets, name, options);

  return {
    values: removal.values,
    frames: [...scan, ...removal.frames],
    summary: `Removed ${targets.length} occurrence(s) of ${value}. ${name} is now [${removal.values.join(", ")}].`,
    complexity: {
      time: "O(n)",
      space: "O(1)",
      reason: "One scan to find the matches, then one shifting pass to close the gaps.",
    },
    meta: { removedIndices: targets },
  };
}
