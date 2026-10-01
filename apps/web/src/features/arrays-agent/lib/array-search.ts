import {
  COMPLEXITY,
  frame,
  isSortedAscending,
  toNumeric,
} from "@/features/arrays-agent/lib/array-frames";
import type {
  ArrayFrame,
  ArrayOpResult,
  ArrayValue,
} from "@/features/arrays-agent/lib/array-types";

export function linearSearch(
  values: ArrayValue[],
  target: string,
  name = "A",
): ArrayOpResult {
  if (values.length === 0) {
    return {
      values: [],
      frames: [frame(values, `${name} is empty — nothing to search.`)],
      summary: `${name} is empty.`,
      rejected: true,
    };
  }

  const frames: ArrayFrame[] = [
    frame(values, `Looking for ${target}, checking every slot from index 0.`),
  ];

  let foundIndex = -1;
  for (let index = 0; index < values.length; index++) {
    const hit = values[index] === target;
    frames.push(
      frame(values, `${name}[${index}] is ${values[index]} — ${hit ? `match!` : `not ${target}, keep going.`}`, {
        active: [index],
        visited: Array.from({ length: index }, (_, i) => i),
        found: hit ? index : undefined,
      }),
    );
    if (hit) {
      foundIndex = index;
      break;
    }
  }

  if (foundIndex === -1) {
    frames.push(
      frame(values, `Checked all ${values.length} slots — ${target} is not here.`, {
        visited: values.map((_, index) => index),
      }),
    );
  }

  return {
    values: [...values],
    frames,
    summary:
      foundIndex === -1
        ? `${target} is not in ${name}. Linear search compared all ${values.length} elements to be sure.`
        : `Found ${target} at index ${foundIndex} after ${foundIndex + 1} comparison(s).`,
    complexity: COMPLEXITY.linear_search,
    meta: { foundIndex, comparisons: foundIndex === -1 ? values.length : foundIndex + 1 },
  };
}

export function binarySearch(
  values: ArrayValue[],
  target: string,
  name = "A",
): ArrayOpResult {
  const numbers = toNumeric(values);
  const needle = Number(target);

  if (!numbers || !Number.isFinite(needle)) {
    return {
      values: [...values],
      frames: [frame(values, "Binary search needs numeric values.")],
      summary: "Binary search needs every element and the target to be numeric.",
      rejected: true,
    };
  }
  if (!isSortedAscending(numbers)) {
    return {
      values: [...values],
      frames: [
        frame(values, "Binary search only works on a sorted array."),
      ],
      summary: `${name} is not sorted, so binary search would be unreliable. Sort it first, then search.`,
      rejected: true,
    };
  }

  const frames: ArrayFrame[] = [
    frame(values, `Looking for ${target} in a sorted array — halve the range each time.`),
  ];

  let low = 0;
  let high = values.length - 1;
  let comparisons = 0;
  let foundIndex = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    comparisons++;
    // Everything outside [low, high] has been ruled out — showing it as
    // "visited" is what makes the halving visible rather than just asserted.
    const ruledOut = values
      .map((_, index) => index)
      .filter((index) => index < low || index > high);

    if (numbers[mid] === needle) {
      frames.push(
        frame(values, `Middle is index ${mid} = ${values[mid]} — that is ${target}.`, {
          active: [mid],
          visited: ruledOut,
          found: mid,
          marker: { index: mid, label: "mid" },
        }),
      );
      foundIndex = mid;
      break;
    }

    const goesRight = numbers[mid] < needle;
    frames.push(
      frame(
        values,
        `Middle is index ${mid} = ${values[mid]}. ${target} is ${goesRight ? "larger" : "smaller"}, so discard the ${goesRight ? "left" : "right"} half.`,
        {
          active: [mid],
          visited: ruledOut,
          marker: { index: mid, label: "mid" },
        },
      ),
    );

    if (goesRight) low = mid + 1;
    else high = mid - 1;
  }

  if (foundIndex === -1) {
    frames.push(
      frame(values, `The range is empty — ${target} is not in ${name}.`, {
        visited: values.map((_, index) => index),
      }),
    );
  }

  return {
    values: [...values],
    frames,
    summary:
      foundIndex === -1
        ? `${target} is not in ${name}. Binary search ruled it out in ${comparisons} comparison(s).`
        : `Found ${target} at index ${foundIndex} in ${comparisons} comparison(s) — a linear scan would have taken up to ${values.length}.`,
    complexity: COMPLEXITY.binary_search,
    meta: { foundIndex, comparisons },
  };
}

export function findAllOccurrences(
  values: ArrayValue[],
  target: string,
  name = "A",
): ArrayOpResult {
  const matches: number[] = [];
  const frames: ArrayFrame[] = [
    frame(values, `Scanning the whole array for every ${target} — no early exit.`),
  ];

  values.forEach((value, index) => {
    const hit = value === target;
    if (hit) matches.push(index);
    frames.push(
      frame(values, `${name}[${index}] = ${value}${hit ? ` — match #${matches.length}.` : ""}`, {
        active: [index],
        visited: Array.from({ length: index }, (_, i) => i),
        settled: [...matches],
      }),
    );
  });

  frames.push(
    frame(
      values,
      matches.length
        ? `${target} appears ${matches.length} time(s), at ${matches.join(", ")}.`
        : `${target} never appears in ${name}.`,
      { settled: matches, visited: values.map((_, index) => index) },
    ),
  );

  return {
    values: [...values],
    frames,
    summary: matches.length
      ? `${target} occurs ${matches.length} time(s) in ${name}, at indices ${matches.join(", ")}.`
      : `${target} does not occur in ${name}.`,
    complexity: {
      time: "O(n)",
      space: "O(k)",
      reason:
        "Every element must be checked even after a match, since later duplicates could still exist.",
    },
    meta: { indices: matches, count: matches.length },
  };
}
