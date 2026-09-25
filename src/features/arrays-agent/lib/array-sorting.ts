/**
 * The five sort algorithms: bubble, selection, insertion, merge, quick.
 *
 * Same pure `(values, ...args) => ArrayOpResult` shape as array-ops.ts — see
 * that file's docstring for how the operation split works. Each algorithm
 * also produces `SortStep`s internally (comparisons/swaps/pivots) before
 * being flattened to the same `ArrayFrame` list every other operation uses —
 * that's what lets `compare_algorithms` show two algorithms' step counts
 * side by side without touching the board.
 */
import { COMPLEXITY, frame, toNumeric } from "@/features/arrays-agent/lib/array-frames";
import type {
  ArrayFrame,
  ArrayOpResult,
  ArrayValue,
  SortOptions,
  SortResult,
  SortStep,
} from "@/features/arrays-agent/lib/array-types";

/**
 * Shared recorder every algorithm writes through.
 *
 * This is what stops the five sorts being five unrelated systems: none of them
 * owns an array or a step format. They mutate the tape's buffer through these
 * methods, and the tape produces one uniform `SortResult` — so bubble sort and
 * quick sort animate through exactly the same player.
 */
class SortTape {
  readonly steps: SortStep[] = [];
  comparisons = 0;
  swaps = 0;
  readonly values: number[];
  private readonly original: number[];
  private held: SortStep["held"];

  constructor(
    input: number[],
    private readonly options: SortOptions,
  ) {
    this.values = [...input];
    this.original = [...input];
  }

  /**
   * Declare a value as lifted out of the array. Every step emitted until
   * `release()` carries it, so the transient duplicate that in-place shifting
   * produces is explained on screen rather than looking like a glitch.
   */
  hold(value: number, label: string) {
    this.held = { value: String(value), label };
  }

  release() {
    this.held = undefined;
  }

  /** True when `left` must come after `right` in the requested order. */
  outOfOrder(left: number, right: number): boolean {
    return this.options.order === "descending" ? left < right : left > right;
  }

  private push(step: Omit<SortStep, "values" | "held">) {
    this.steps.push({ ...step, values: [...this.values], held: this.held });
  }

  compare(i: number, j: number, note: string) {
    this.comparisons++;
    this.push({ kind: "compare", indices: [i, j], note });
  }

  swap(i: number, j: number, note: string) {
    [this.values[i], this.values[j]] = [this.values[j], this.values[i]];
    this.swaps++;
    this.push({ kind: "swap", indices: [i, j], note });
  }

  overwrite(index: number, value: number, note: string) {
    this.values[index] = value;
    this.swaps++;
    this.push({ kind: "overwrite", indices: [index], note });
  }

  settle(indices: number[], note: string) {
    this.push({ kind: "settle", indices, note });
  }

  pivot(index: number, note: string) {
    this.push({ kind: "pivot", indices: [index], note });
  }

  finish(algorithm: string): SortResult {
    return {
      algorithm,
      original: this.original,
      sorted: [...this.values],
      steps: this.steps,
      comparisons: this.comparisons,
      swaps: this.swaps,
    };
  }
}

const direction = (options: SortOptions) =>
  options.order === "descending" ? "largest first" : "smallest first";

// ── The five algorithms ─────────────────────────────────────────────────

export function bubbleSort(input: number[], options: SortOptions): SortResult {
  const tape = new SortTape(input, options);
  const n = tape.values.length;

  for (let pass = 0; pass < n - 1; pass++) {
    let swappedThisPass = false;
    for (let i = 0; i < n - pass - 1; i++) {
      const [left, right] = [tape.values[i], tape.values[i + 1]];
      tape.compare(i, i + 1, `Compare ${left} and ${right}.`);
      if (tape.outOfOrder(left, right)) {
        tape.swap(i, i + 1, `${left} and ${right} are out of order — swap them.`);
        swappedThisPass = true;
      }
    }
    tape.settle(
      [n - pass - 1],
      `Pass ${pass + 1} done — ${tape.values[n - pass - 1]} has bubbled to its final place.`,
    );
    // An untouched pass proves the rest is ordered. Stopping here is the whole
    // reason bubble sort is O(n) on already-sorted input.
    if (!swappedThisPass) {
      tape.settle(
        Array.from({ length: n - pass - 1 }, (_, i) => i),
        "No swaps this pass — the array is already sorted, so stop early.",
      );
      break;
    }
  }

  return tape.finish("bubble_sort");
}

export function selectionSort(input: number[], options: SortOptions): SortResult {
  const tape = new SortTape(input, options);
  const n = tape.values.length;

  for (let start = 0; start < n - 1; start++) {
    let best = start;
    tape.pivot(start, `Looking for the ${direction(options).replace(" first", "")} value from index ${start} on.`);

    for (let i = start + 1; i < n; i++) {
      tape.compare(best, i, `Is ${tape.values[i]} better than ${tape.values[best]}?`);
      if (tape.outOfOrder(tape.values[best], tape.values[i])) best = i;
    }

    if (best !== start) {
      const chosen = tape.values[best];
      tape.swap(start, best, `Swap ${chosen} into index ${start}.`);
    } else {
      tape.settle([start], `${tape.values[start]} is already the right value for index ${start}.`);
    }
    tape.settle(
      Array.from({ length: start + 1 }, (_, i) => i),
      `Index ${start} is now final.`,
    );
  }
  tape.settle(
    Array.from({ length: n }, (_, i) => i),
    "Every index is now final.",
  );

  return tape.finish("selection_sort");
}

export function insertionSort(input: number[], options: SortOptions): SortResult {
  const tape = new SortTape(input, options);
  const n = tape.values.length;

  tape.settle([0], "Treat the first element as a sorted region of one.");

  for (let i = 1; i < n; i++) {
    const held = tape.values[i];
    tape.hold(held, "holding");
    tape.pivot(i, `Lift ${held} out and slide it back into the sorted region.`);

    let slot = i - 1;
    while (slot >= 0) {
      tape.compare(slot, slot + 1, `Compare ${tape.values[slot]} with ${held}.`);
      if (!tape.outOfOrder(tape.values[slot], held)) break;
      tape.overwrite(slot + 1, tape.values[slot], `${tape.values[slot]} moves right to make room.`);
      slot--;
    }

    tape.release();
    tape.overwrite(slot + 1, held, `Drop ${held} into index ${slot + 1}.`);
    tape.settle(
      Array.from({ length: i + 1 }, (_, index) => index),
      `The first ${i + 1} elements are sorted among themselves.`,
    );
  }

  return tape.finish("insertion_sort");
}

export function mergeSort(input: number[], options: SortOptions): SortResult {
  const tape = new SortTape(input, options);

  const merge = (low: number, mid: number, high: number) => {
    const left = tape.values.slice(low, mid + 1);
    const right = tape.values.slice(mid + 1, high + 1);
    let l = 0;
    let r = 0;
    let write = low;

    while (l < left.length && r < right.length) {
      tape.compare(low + l, mid + 1 + r, `Compare ${left[l]} and ${right[r]} at the front of each half.`);
      const takeRight = tape.outOfOrder(left[l], right[r]);
      const value = takeRight ? right[r++] : left[l++];
      tape.hold(value, "from buffer");
      tape.overwrite(write, value, `${value} is next — write it to index ${write}.`);
      write++;
    }
    while (l < left.length) {
      const value = left[l++];
      tape.hold(value, "from buffer");
      tape.overwrite(write, value, `Left half still has ${value} — copy it over.`);
      write++;
    }
    while (r < right.length) {
      const value = right[r++];
      tape.hold(value, "from buffer");
      tape.overwrite(write, value, `Right half still has ${value} — copy it over.`);
      write++;
    }
    tape.release();

    tape.settle(
      Array.from({ length: high - low + 1 }, (_, i) => low + i),
      `Indices ${low}–${high} are now merged and ordered.`,
    );
  };

  const sort = (low: number, high: number) => {
    if (low >= high) return;
    const mid = Math.floor((low + high) / 2);
    tape.pivot(mid, `Split indices ${low}–${high} into ${low}–${mid} and ${mid + 1}–${high}.`);
    sort(low, mid);
    sort(mid + 1, high);
    merge(low, mid, high);
  };

  sort(0, tape.values.length - 1);
  return tape.finish("merge_sort");
}

export function quickSort(
  input: number[],
  options: SortOptions & { pivotValue?: number },
): SortResult {
  const tape = new SortTape(input, options);

  const partition = (low: number, high: number) => {
    // The teacher can name the pivot ("use 5 as the pivot"). Honour it by
    // swapping that value to the end first, so the standard Lomuto scan below
    // is unchanged — one partition implementation, two ways of choosing.
    if (options.pivotValue !== undefined) {
      const chosen = tape.values.indexOf(options.pivotValue, low);
      if (chosen >= low && chosen <= high && chosen !== high) {
        tape.swap(chosen, high, `Move the chosen pivot ${options.pivotValue} to the end of the range.`);
      }
    }

    const pivot = tape.values[high];
    tape.pivot(high, `Pivot is ${pivot}. Everything smaller goes left of it.`);

    let boundary = low;
    for (let i = low; i < high; i++) {
      tape.compare(i, high, `Is ${tape.values[i]} on the correct side of ${pivot}?`);
      if (tape.outOfOrder(pivot, tape.values[i])) {
        if (i !== boundary) {
          tape.swap(boundary, i, `Move ${tape.values[i]} into the left partition.`);
        }
        boundary++;
      }
    }

    if (boundary !== high) {
      tape.swap(boundary, high, `Drop the pivot ${pivot} into index ${boundary} — its final place.`);
    }
    tape.settle([boundary], `${pivot} is now in its final position.`);
    return boundary;
  };

  const sort = (low: number, high: number) => {
    if (low >= high) return;
    const split = partition(low, high);
    sort(low, split - 1);
    sort(split + 1, high);
  };

  sort(0, tape.values.length - 1);
  tape.settle(
    Array.from({ length: tape.values.length }, (_, i) => i),
    "Every partition has collapsed to one element — the array is sorted.",
  );

  return tape.finish("quick_sort");
}

export const SORT_ALGORITHMS = {
  bubble_sort: bubbleSort,
  selection_sort: selectionSort,
  insertion_sort: insertionSort,
  merge_sort: mergeSort,
  quick_sort: quickSort,
} as const;

export type SortAlgorithmName = keyof typeof SORT_ALGORITHMS;

// ── Bridging sorts into the shared frame format ─────────────────────────

/**
 * Turns a `SortResult` into the same `ArrayFrame[]` every other operation
 * produces. `settle` steps are cumulative — once an index is final it stays
 * marked — which is what gives all five sorts a visible "sorted region grows"
 * story instead of a flicker.
 */
export function sortResultToFrames(
  result: SortResult,
  name: string,
): ArrayFrame[] {
  const settled = new Set<number>();
  let marker: ArrayFrame["marker"];

  const frames: ArrayFrame[] = [
    frame(
      result.original.map(String),
      `${label(result.algorithm)} on ${name} — ${result.original.length} elements.`,
    ),
  ];

  for (const step of result.steps) {
    const values = step.values.map(String);

    if (step.kind === "settle") {
      step.indices.forEach((index) => settled.add(index));
      frames.push(frame(values, step.note, { settled: [...settled], held: step.held }));
      // A settle ends a sub-phase, so the pivot pointer from that phase stops
      // applying — leaving it up would label an unrelated cell in the next one.
      marker = undefined;
      continue;
    }

    if (step.kind === "pivot") {
      marker = { index: step.indices[0], label: "pivot" };
    }

    frames.push(
      frame(values, step.note, {
        active: step.indices,
        settled: [...settled],
        marker,
        held: step.held,
      }),
    );
  }

  frames.push(
    frame(result.sorted.map(String), `Sorted: ${result.sorted.join(", ")}.`, {
      settled: result.sorted.map((_, index) => index),
    }),
  );

  return frames;
}

function label(algorithm: string) {
  return algorithm.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * The single entry point every sorting tool calls. Coercion, ordering, frame
 * conversion and stats reporting happen once, here — so adding a sixth
 * algorithm means writing the algorithm and nothing else.
 */
export function runSort(
  values: ArrayValue[],
  algorithm: SortAlgorithmName,
  options: SortOptions & { pivotValue?: number },
  name = "A",
): ArrayOpResult {
  const numbers = toNumeric(values);
  if (!numbers) {
    return {
      values: [...values],
      frames: [frame(values, "Sorting needs every element to be numeric.")],
      summary: `${name} contains non-numeric values, so it cannot be sorted by size.`,
      rejected: true,
    };
  }
  if (numbers.length < 2) {
    return {
      values: [...values],
      frames: [frame(values, "An array of one element is already sorted.")],
      summary: `${name} has fewer than two elements, so it is already sorted.`,
    };
  }

  const result =
    algorithm === "quick_sort"
      ? quickSort(numbers, options)
      : SORT_ALGORITHMS[algorithm](numbers, options);

  return {
    values: result.sorted.map(String),
    frames: sortResultToFrames(result, name),
    summary: `${label(result.algorithm)} sorted ${name} ${options.order} in ${result.comparisons} comparison(s) and ${result.swaps} move(s): [${result.sorted.join(", ")}].`,
    complexity: COMPLEXITY[algorithm],
    meta: {
      algorithm: result.algorithm,
      comparisons: result.comparisons,
      swaps: result.swaps,
      original: result.original,
      sorted: result.sorted,
      steps: options.showSteps ? result.steps.map((step) => step.note) : undefined,
    },
  };
}

/** Runs several algorithms on the same input so the class can compare cost. */
export function compareAlgorithms(
  values: ArrayValue[],
  algorithms: SortAlgorithmName[],
  order: SortOptions["order"],
) {
  const numbers = toNumeric(values);
  if (!numbers) return null;

  return algorithms.map((algorithm) => {
    const result = SORT_ALGORITHMS[algorithm](numbers, { order });
    return {
      algorithm: result.algorithm,
      comparisons: result.comparisons,
      swaps: result.swaps,
      steps: result.steps.length,
      complexity: COMPLEXITY[algorithm],
    };
  });
}
