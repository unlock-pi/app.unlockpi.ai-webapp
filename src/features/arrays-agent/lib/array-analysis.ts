/**
 * Read-only questions about the array that aren't a search or a sort:
 * counting occurrences, duplicates, min/max, sum/average — plus the frequency
 * comparison overlay. Same pure `(values, ...args) => ArrayOpResult` shape as
 * array-ops.ts — see that file's docstring for how the operation split works.
 */
import { frame, toNumeric } from "@/features/arrays-agent/lib/array-frames";
import type {
  ArrayFrame,
  ArrayOpResult,
  ArrayValue,
} from "@/features/arrays-agent/lib/array-types";

function reject(values: ArrayValue[], summary: string): ArrayOpResult {
  return { values: [...values], frames: [frame(values, summary)], summary, rejected: true };
}

const SCAN_COMPLEXITY = {
  time: "O(n)",
  space: "O(1)",
  reason: "Every element must be examined once; nothing lets you skip any.",
};

/**
 * A single running-scan animation shared by min, max and sum.
 *
 * All three are the same walk with a different accumulator, so they share one
 * frame generator — otherwise the class would see three subtly different
 * animations for what is pedagogically one idea.
 */
function scan(
  values: ArrayValue[],
  numbers: number[],
  name: string,
  label: string,
  step: (running: number, next: number) => number,
  seed: number,
  describe: (running: number, index: number) => string,
) {
  let running = seed;
  const frames: ArrayFrame[] = [
    frame(values, `Walking ${name} to find the ${label}.`),
  ];

  numbers.forEach((value, index) => {
    running = index === 0 ? value : step(running, value);
    frames.push(
      frame(values, describe(running, index), {
        active: [index],
        visited: Array.from({ length: index }, (_, i) => i),
      }),
    );
  });

  return { running, frames };
}

export function analyzeArray(
  values: ArrayValue[],
  metric:
    | "min"
    | "max"
    | "sum"
    | "average"
    | "count"
    | "kth_smallest"
    | "kth_largest"
    | "two_sum"
    | "is_sorted",
  options: { k?: number; target?: string } = {},
  name = "A",
): ArrayOpResult {
  if (values.length === 0) return reject(values, `${name} is empty.`);

  // Count is the one metric that works on any value type, so it is handled
  // before the numeric gate below.
  if (metric === "count") {
    const target = options.target ?? "";
    const hits: number[] = [];
    const frames = values.map((value, index) => {
      if (value === target) hits.push(index);
      return frame(values, `${name}[${index}] = ${value}${value === target ? " ✓" : ""}`, {
        active: [index],
        visited: Array.from({ length: index }, (_, i) => i),
        settled: [...hits],
      });
    });
    frames.push(
      frame(values, `${target} appears ${hits.length} time(s).`, { settled: hits }),
    );
    return {
      values: [...values],
      frames,
      summary: `${target} appears ${hits.length} time(s) in ${name}${hits.length ? `, at ${hits.join(", ")}` : ""}.`,
      complexity: SCAN_COMPLEXITY,
      meta: { count: hits.length, indices: hits },
    };
  }

  const numbers = toNumeric(values);
  if (!numbers) {
    return reject(values, `${metric} needs numeric values, and ${name} has non-numeric entries.`);
  }

  if (metric === "is_sorted") {
    const ascending = numbers.every((v, i) => i === 0 || numbers[i - 1] <= v);
    const descending = numbers.every((v, i) => i === 0 || numbers[i - 1] >= v);
    const firstBreak = numbers.findIndex((v, i) => i > 0 && numbers[i - 1] > v);
    return {
      values: [...values],
      frames: [
        frame(
          values,
          ascending
            ? "Every element is ≥ the one before it — sorted."
            : `${values[firstBreak]} at index ${firstBreak} is smaller than the one before it.`,
          { active: ascending ? [] : [firstBreak - 1, firstBreak] },
        ),
      ],
      summary: ascending
        ? `${name} is sorted ascending, so binary search would work on it.`
        : descending
          ? `${name} is sorted descending.`
          : `${name} is not sorted — index ${firstBreak} breaks the order.`,
      complexity: SCAN_COMPLEXITY,
      meta: { ascending, descending },
    };
  }

  if (metric === "two_sum") {
    const target = Number(options.target);
    if (!Number.isFinite(target)) {
      return reject(values, "Say what the two values should add up to.");
    }
    const frames: ArrayFrame[] = [
      frame(values, `Looking for two elements that add to ${target}.`),
    ];
    for (let left = 0; left < numbers.length; left++) {
      for (let right = left + 1; right < numbers.length; right++) {
        const total = numbers[left] + numbers[right];
        const hit = total === target;
        frames.push(
          frame(values, `${numbers[left]} + ${numbers[right]} = ${total}${hit ? " ✓" : ""}`, {
            active: [left, right],
            settled: hit ? [left, right] : [],
          }),
        );
        if (hit) {
          return {
            values: [...values],
            frames,
            summary: `${values[left]} at index ${left} and ${values[right]} at index ${right} add to ${target}.`,
            complexity: {
              time: "O(n²)",
              space: "O(1)",
              reason: "Every pair is tried; a hash map would bring this down to O(n).",
            },
            meta: { indices: [left, right] },
          };
        }
      }
    }
    return {
      values: [...values],
      frames,
      summary: `No two elements of ${name} add to ${target}.`,
      complexity: { time: "O(n²)", space: "O(1)", reason: "Every pair was tried." },
    };
  }

  if (metric === "kth_smallest" || metric === "kth_largest") {
    const k = options.k ?? 1;
    if (k < 1 || k > numbers.length) {
      return reject(values, `k must be between 1 and ${numbers.length}.`);
    }
    const ordered = [...numbers].sort((a, b) =>
      metric === "kth_smallest" ? a - b : b - a,
    );
    const answer = ordered[k - 1];
    const index = numbers.indexOf(answer);
    return {
      values: [...values],
      frames: [
        frame(values, `Sorting a copy to pick the ${k}${ordinal(k)} ${metric === "kth_smallest" ? "smallest" : "largest"}.`),
        frame(values, `That is ${answer}, at index ${index}.`, {
          active: [index],
          found: index,
        }),
      ],
      summary: `The ${k}${ordinal(k)} ${metric === "kth_smallest" ? "smallest" : "largest"} value in ${name} is ${answer}, at index ${index}.`,
      complexity: {
        time: "O(n log n)",
        space: "O(n)",
        reason: "A copy is sorted; quickselect would do it in O(n) on average.",
      },
      meta: { value: answer, index },
    };
  }

  if (metric === "sum" || metric === "average") {
    const { running, frames } = scan(
      values,
      numbers,
      name,
      metric,
      (total, next) => total + next,
      0,
      (total, index) => `Running total after index ${index}: ${total}`,
    );
    const average = running / numbers.length;
    frames.push(
      frame(
        values,
        metric === "sum"
          ? `Total: ${running}`
          : `Total ${running} ÷ ${numbers.length} = ${round(average)}`,
        { visited: values.map((_, index) => index) },
      ),
    );
    return {
      values: [...values],
      frames,
      summary:
        metric === "sum"
          ? `The elements of ${name} add up to ${running}.`
          : `${name} averages ${round(average)} (${running} ÷ ${numbers.length}).`,
      complexity: SCAN_COMPLEXITY,
      meta: { sum: running, average },
    };
  }

  // min / max
  const isMin = metric === "min";
  const { running, frames } = scan(
    values,
    numbers,
    name,
    isMin ? "smallest" : "largest",
    (best, next) => (isMin ? Math.min(best, next) : Math.max(best, next)),
    numbers[0],
    (best, index) => `Best so far after index ${index}: ${best}`,
  );
  const index = numbers.indexOf(running);
  frames.push(
    frame(values, `${isMin ? "Smallest" : "Largest"} is ${running}, at index ${index}.`, {
      active: [index],
      found: index,
    }),
  );

  return {
    values: [...values],
    frames,
    summary: `The ${isMin ? "smallest" : "largest"} value in ${name} is ${running}, at index ${index}.`,
    complexity: SCAN_COMPLEXITY,
    meta: { value: running, index },
  };
}

export function transformArray(
  values: ArrayValue[],
  operation: "reverse" | "remove_duplicates" | "swap" | "shuffle" | "rotate",
  options: { from?: number; to?: number; by?: number } = {},
  name = "A",
): ArrayOpResult {
  if (values.length === 0) return reject(values, `${name} is empty.`);

  if (operation === "reverse") {
    const next = [...values];
    const frames: ArrayFrame[] = [
      frame(values, "Swap the ends, then work inwards."),
    ];
    for (let left = 0, right = next.length - 1; left < right; left++, right--) {
      [next[left], next[right]] = [next[right], next[left]];
      frames.push(
        frame([...next], `Swap index ${left} with index ${right}.`, {
          active: [left, right],
          settled: [
            ...Array.from({ length: left + 1 }, (_, i) => i),
            ...Array.from({ length: next.length - right }, (_, i) => right + i),
          ],
        }),
      );
    }
    frames.push(
      frame([...next], `Reversed: ${next.join(", ")}`, {
        settled: next.map((_, index) => index),
      }),
    );
    return {
      values: next,
      frames,
      summary: `Reversed ${name} in place: [${next.join(", ")}].`,
      complexity: {
        time: "O(n)",
        space: "O(1)",
        reason: "Each element is moved once, using two pointers walking inwards.",
      },
    };
  }

  if (operation === "remove_duplicates") {
    const seen = new Set<string>();
    const kept: number[] = [];
    const frames: ArrayFrame[] = [frame(values, "Keeping the first of each value.")];

    values.forEach((value, index) => {
      const duplicate = seen.has(value);
      if (!duplicate) {
        seen.add(value);
        kept.push(index);
      }
      frames.push(
        frame(values, `${value}${duplicate ? " — already seen, drop it." : " — first time, keep it."}`, {
          active: [index],
          visited: Array.from({ length: index }, (_, i) => i),
          settled: [...kept],
        }),
      );
    });

    const next = kept.map((index) => values[index]);
    frames.push(
      frame(next, `${values.length - next.length} duplicate(s) removed.`, {
        settled: next.map((_, index) => index),
      }),
    );
    return {
      values: next,
      frames,
      summary: `Removed ${values.length - next.length} duplicate(s). ${name} is now [${next.join(", ")}].`,
      complexity: {
        time: "O(n)",
        space: "O(n)",
        reason: "One pass, with a set remembering which values have been seen.",
      },
    };
  }

  if (operation === "swap") {
    const { from, to } = options;
    if (
      typeof from !== "number" ||
      typeof to !== "number" ||
      from < 0 ||
      to < 0 ||
      from >= values.length ||
      to >= values.length
    ) {
      return reject(
        values,
        `Both indices must be between 0 and ${values.length - 1}.`,
      );
    }
    const next = [...values];
    [next[from], next[to]] = [next[to], next[from]];
    return {
      values: next,
      frames: [
        frame(values, `Swapping index ${from} and index ${to}.`, { active: [from, to] }),
        frame(next, `${values[from]} and ${values[to]} have traded places.`, {
          active: [from, to],
        }),
      ],
      summary: `Swapped index ${from} and ${to}. ${name} is now [${next.join(", ")}].`,
      complexity: {
        time: "O(1)",
        space: "O(1)",
        reason: "Two known addresses are exchanged; nothing else moves.",
      },
    };
  }

  if (operation === "rotate") {
    const by = ((options.by ?? 1) % values.length + values.length) % values.length;
    const next = [...values.slice(by), ...values.slice(0, by)];
    return {
      values: next,
      frames: [
        frame(values, `Rotating left by ${by}.`, {
          active: Array.from({ length: by }, (_, i) => i),
        }),
        frame(next, `The first ${by} element(s) wrapped around to the end.`, {
          settled: next.map((_, index) => index),
        }),
      ],
      summary: `Rotated ${name} left by ${by}: [${next.join(", ")}].`,
      complexity: {
        time: "O(n)",
        space: "O(n)",
        reason: "Every element shifts; a reversal trick can do it in O(1) space.",
      },
    };
  }

  // shuffle
  const next = [...values];
  const frames: ArrayFrame[] = [frame(values, "Shuffling into a random order.")];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
    frames.push(
      frame([...next], `Swap index ${i} with index ${j}.`, { active: [i, j] }),
    );
  }
  return {
    values: next,
    frames,
    summary: `Shuffled ${name}: [${next.join(", ")}].`,
    complexity: {
      time: "O(n)",
      space: "O(1)",
      reason: "Fisher–Yates: one pass, swapping each element with a random earlier one.",
    },
  };
}

function ordinal(n: number) {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
