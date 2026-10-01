import { MAX_ARRAY_LENGTH, frame, toNumeric } from "@/features/arrays-agent/lib/array-frames";
import type {
  ArrayFrame,
  ArrayOpResult,
  ArrayValue,
} from "@/features/arrays-agent/lib/array-types";

export type CombineNames = { a: string; b: string; result: string };

function reject(summary: string): ArrayOpResult {
  return { values: [], frames: [frame([], summary)], summary, rejected: true };
}

/**
 * Two arrays becoming one.
 *
 * The animation builds the RESULT strip a cell at a time while the sources
 * stay on the board untouched — that is the whole point of the lesson: a
 * concatenation does not move anything out of the originals, it copies into
 * fresh, contiguous memory. Each beat names where the value came from.
 */
export function concatArrays(
  a: ArrayValue[],
  b: ArrayValue[],
  names: CombineNames,
): ArrayOpResult {
  if (a.length === 0 && b.length === 0) {
    return reject("Both arrays are empty, so there is nothing to join.");
  }
  if (a.length + b.length > MAX_ARRAY_LENGTH) {
    return reject(
      `${names.a} has ${a.length} and ${names.b} has ${b.length}, so joining them needs ${a.length + b.length} cells — more than the ${MAX_ARRAY_LENGTH} this frame can show. Shorten one of them first.`,
    );
  }

  const result: ArrayValue[] = [];
  const frames: ArrayFrame[] = [
    frame(
      [],
      `${names.result} starts empty, with room for ${a.length} + ${b.length} = ${a.length + b.length} values.`,
    ),
  ];

  a.forEach((value, index) => {
    result.push(value);
    frames.push(
      frame([...result], `Copy ${names.a}[${index}] = ${value} into ${names.result}[${result.length - 1}].`, {
        active: [result.length - 1],
        settled: Array.from({ length: result.length - 1 }, (_, i) => i),
      }),
    );
  });

  const offset = a.length;
  b.forEach((value, index) => {
    result.push(value);
    frames.push(
      frame(
        [...result],
        `Copy ${names.b}[${index}] = ${value} into ${names.result}[${result.length - 1}] — ${names.b}'s index ${index} became ${offset} + ${index}.`,
        {
          active: [result.length - 1],
          settled: Array.from({ length: result.length - 1 }, (_, i) => i),
        },
      ),
    );
  });

  frames.push(
    frame([...result], `${names.result} = ${names.a} followed by ${names.b}.`, {
      settled: result.map((_, index) => index),
    }),
  );

  return {
    values: result,
    frames,
    summary: `Joined ${names.a} and ${names.b} into ${names.result} = [${result.join(", ")}] (${result.length} elements). Neither original changed; every value was copied.`,
    complexity: {
      time: "O(n + m)",
      space: "O(n + m)",
      reason:
        "Every element of both arrays is copied once into a new block big enough to hold them all.",
    },
    meta: { length: result.length, from: [a.length, b.length] },
  };
}

/**
 * Element-wise addition: the other thing teachers mean by "adding arrays".
 *
 * Refusing on a length mismatch is the lesson, not an inconvenience — the
 * message says which index runs out, because "why can't I add these" is the
 * question the class will ask.
 */
export function addArrays(
  a: ArrayValue[],
  b: ArrayValue[],
  names: CombineNames,
): ArrayOpResult {
  if (a.length !== b.length) {
    return reject(
      `${names.a} has ${a.length} elements and ${names.b} has ${b.length}. Element-wise addition needs one partner for every index, so index ${Math.min(a.length, b.length)} would have nothing to pair with.`,
    );
  }
  if (a.length === 0) return reject("Both arrays are empty, so there is nothing to add.");

  const left = toNumeric(a);
  const right = toNumeric(b);
  if (!left || !right) {
    return reject(
      `Adding element by element needs numbers in both arrays. Use concatenate to join them end to end instead.`,
    );
  }

  const result: ArrayValue[] = [];
  const frames: ArrayFrame[] = [
    frame([], `Adding ${names.a} and ${names.b} index by index.`),
  ];

  left.forEach((value, index) => {
    const sum = value + right[index];
    result.push(String(sum));
    frames.push(
      frame([...result], `${names.a}[${index}] + ${names.b}[${index}] = ${value} + ${right[index]} = ${sum}`, {
        active: [index],
        settled: Array.from({ length: index }, (_, i) => i),
      }),
    );
  });

  frames.push(
    frame([...result], `${names.result} = [${result.join(", ")}]`, {
      settled: result.map((_, index) => index),
    }),
  );

  return {
    values: result,
    frames,
    summary: `Added ${names.a} and ${names.b} element by element into ${names.result} = [${result.join(", ")}].`,
    complexity: {
      time: "O(n)",
      space: "O(n)",
      reason: "One pass over the pair of arrays, writing each sum into a new block.",
    },
  };
}

/**
 * Merging two SORTED arrays — the step at the heart of merge sort, shown on
 * two real arrays rather than inside a recursion.
 */
export function mergeSortedArrays(
  a: ArrayValue[],
  b: ArrayValue[],
  names: CombineNames,
): ArrayOpResult {
  if (a.length + b.length > MAX_ARRAY_LENGTH) {
    return reject(
      `Merging needs ${a.length + b.length} cells, more than the ${MAX_ARRAY_LENGTH} this frame can show.`,
    );
  }

  const left = toNumeric(a);
  const right = toNumeric(b);
  if (!left || !right) return reject("Merging needs numeric values in both arrays.");

  const sorted = (values: number[]) =>
    values.every((value, index) => index === 0 || values[index - 1] <= value);
  if (!sorted(left) || !sorted(right)) {
    return reject(
      `Merging only works when both arrays are already sorted ascending. Sort ${sorted(left) ? names.b : names.a} first.`,
    );
  }

  const result: ArrayValue[] = [];
  const frames: ArrayFrame[] = [
    frame([], `Both are sorted, so compare their fronts and take the smaller each time.`),
  ];

  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    const takeLeft = left[i] <= right[j];
    const value = takeLeft ? left[i] : right[j];
    frames.push(
      frame([...result, String(value)], `${left[i]} vs ${right[j]} — take ${value} from ${takeLeft ? names.a : names.b}.`, {
        active: [result.length],
        settled: Array.from({ length: result.length }, (_, index) => index),
      }),
    );
    result.push(String(value));
    if (takeLeft) i++;
    else j++;
  }

  while (i < left.length) {
    result.push(String(left[i]));
    frames.push(
      frame([...result], `${names.b} is exhausted — copy the rest of ${names.a}: ${left[i]}.`, {
        active: [result.length - 1],
        settled: Array.from({ length: result.length - 1 }, (_, index) => index),
      }),
    );
    i++;
  }
  while (j < right.length) {
    result.push(String(right[j]));
    frames.push(
      frame([...result], `${names.a} is exhausted — copy the rest of ${names.b}: ${right[j]}.`, {
        active: [result.length - 1],
        settled: Array.from({ length: result.length - 1 }, (_, index) => index),
      }),
    );
    j++;
  }

  frames.push(
    frame([...result], `${names.result} = [${result.join(", ")}], sorted.`, {
      settled: result.map((_, index) => index),
    }),
  );

  return {
    values: result,
    frames,
    summary: `Merged ${names.a} and ${names.b} into ${names.result} = [${result.join(", ")}], still sorted.`,
    complexity: {
      time: "O(n + m)",
      space: "O(n + m)",
      reason:
        "Each element is looked at once; because both inputs are sorted, no element is ever revisited.",
    },
  };
}
