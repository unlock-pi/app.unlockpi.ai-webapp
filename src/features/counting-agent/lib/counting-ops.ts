import {
  clampTotal,
  divisorError,
  formatBigResult,
  formatExpression,
  formatLegendreExpression,
  frame,
  isPrime,
  legendreTerms,
  totalError,
  valuesInStrip,
} from "@/features/counting-agent/lib/counting-frames";
import type {
  Accumulator,
  CountingFrame,
  CountingOpResult,
  Division,
  HighlightRule,
  Mode,
  Order,
} from "@/features/counting-agent/lib/counting-types";

export type StripInput = {
  total: number;
  order: Order;
  mode: Mode;
  highlights: HighlightRule[];
  division: Division;
  cursor?: number | null;
  accumulator?: Accumulator;
  extracted?: boolean;
};

/** A refusal that still renders: no change, one frame explaining why. */
function refuse(strip: StripInput, summary: string): CountingOpResult {
  return { frames: [frame(strip, summary)], summary, rejected: true };
}

// ── Creation ────────────────────────────────────────────────────────────

export function setCount(strip: StripInput, total: number, order?: Order): CountingOpResult {
  const error = totalError(total);
  if (error) return refuse(strip, error);

  const next: StripInput = {
    total: clampTotal(total),
    order: order ?? strip.order,
    mode: "list",
    highlights: [],
    division: null,
    cursor: null,
    extracted: false,
    accumulator: null,
  };
  return {
    frames: [frame(next, `A fresh strip of ${next.total} numbers, ${next.order}.`)],
    summary: `Showing 1 to ${next.total}, ${next.order}.`,
  };
}

/**
 * N factorial as an actual traversal: switches to factorial display, then
 * visits 1..N (or N..1) one at a time, multiplying as it goes, so the running
 * product BUILDS UP visibly beside the strip instead of only being spoken —
 * and stays there once the pass finishes.
 */
export function createFactorialStrip(strip: StripInput, n: number, order?: Order): CountingOpResult {
  const error = totalError(n);
  if (error) return refuse(strip, error);

  const next: StripInput = {
    total: clampTotal(n),
    order: order ?? "ascending",
    mode: "factorial",
    highlights: [],
    division: null,
    cursor: null,
    accumulator: null,
    extracted: false,
  };
  const values = valuesInStrip(next.total, next.order);
  const result = traverseValues(next, values, {
    accumulate: "product",
    label: `${next.total}! =`,
    noteFor: (value, index) =>
      index === 0 ? `Starting at ${value}.` : `× ${value} —`,
  });
  return {
    frames: result.frames,
    summary: `Showing ${next.total} factorial as repeated multiplication: ${result.finalExpression}.`,
  };
}

// ── Highlights ──────────────────────────────────────────────────────────

export function addHighlight(strip: StripInput, of: number, label?: string): CountingOpResult {
  if (!Number.isInteger(of) || of <= 0) {
    return refuse(strip, "Say a whole number greater than zero to highlight multiples of.");
  }
  if (strip.highlights.some((h) => h.of === of)) {
    return refuse(strip, `Multiples of ${of} are already highlighted.`);
  }

  const rule: HighlightRule = { id: crypto.randomUUID(), label: label ?? `Multiples of ${of}`, of };
  const next: StripInput = { ...strip, highlights: [...strip.highlights, rule] };
  const overlap = strip.highlights.length > 0;
  return {
    frames: [
      frame(
        next,
        overlap
          ? `Also highlighting multiples of ${of} — numbers matching more than one rule stand out further.`
          : `Highlighting multiples of ${of}.`,
      ),
    ],
    summary: `Highlighted multiples of ${of}.`,
  };
}

export function clearHighlights(strip: StripInput): CountingOpResult {
  if (strip.highlights.length === 0) return refuse(strip, "Nothing is highlighted.");
  const next: StripInput = { ...strip, highlights: [] };
  return {
    frames: [frame(next, "Cleared every highlight.")],
    summary: "Cleared the highlights.",
  };
}

// ── Division ────────────────────────────────────────────────────────────

export function setDivision(strip: StripInput, divisor: number): CountingOpResult {
  const error = divisorError(divisor);
  if (error) return refuse(strip, error);

  const next: StripInput = { ...strip, division: { divisor } };
  return {
    frames: [
      frame(
        next,
        `Dividing by ${divisor}: numbers that divide evenly are struck through, the rest show their remainder.`,
      ),
    ],
    summary: `Dividing every number by ${divisor}.`,
  };
}

export function clearDivision(strip: StripInput): CountingOpResult {
  if (!strip.division) return refuse(strip, "Nothing is being divided right now.");
  const next: StripInput = { ...strip, division: null };
  return {
    frames: [frame(next, "Cleared the division.")],
    summary: "Cleared the division.",
  };
}

// ── Order ───────────────────────────────────────────────────────────────

export function reverseOrder(strip: StripInput): CountingOpResult {
  const next: StripInput = { ...strip, order: strip.order === "ascending" ? "descending" : "ascending" };
  return {
    frames: [frame(next, `Now counting ${next.order}.`)],
    summary: `Reversed the order — now ${next.order}.`,
  };
}

export function setOrder(strip: StripInput, order: Order): CountingOpResult {
  if (strip.order === order) return refuse(strip, `Already counting ${order}.`);
  const next: StripInput = { ...strip, order };
  return {
    frames: [frame(next, `Now counting ${order}.`)],
    summary: `Set the order to ${order}.`,
  };
}

// ── Traversal ───────────────────────────────────────────────────────────

export type AccumulateMode = "none" | "product" | "sum" | "list";

/**
 * Walk `values` one at a time, spotlighting each with `cursor` and, when
 * `accumulate` is set, building a running result visible beside the strip.
 * Shared by the `traverse_strip` tool and `createFactorialStrip` (factorial
 * IS a traversal with `accumulate: "product"`).
 */
function traverseValues(
  strip: StripInput,
  values: number[],
  options: {
    accumulate: AccumulateMode;
    label?: string;
    noteFor: (value: number, index: number) => string;
  },
): { frames: CountingFrame[]; finalExpression: string } {
  const { accumulate, label, noteFor } = options;
  const terms: string[] = [];
  let product = BigInt(1);
  let sum = 0;
  const collected: number[] = [];
  let finalExpression = "";

  const frames = values.map((value, index) => {
    let accumulator: Accumulator = strip.accumulator ?? null;

    if (accumulate === "product") {
      product *= BigInt(value);
      terms.push(String(value));
      finalExpression = formatExpression(terms, "×", formatBigResult(product));
      accumulator = { label: label ?? "Product =", value: finalExpression };
    } else if (accumulate === "sum") {
      sum += value;
      terms.push(String(value));
      finalExpression = formatExpression(terms, "+", String(sum));
      accumulator = { label: label ?? "Sum =", value: finalExpression };
    } else if (accumulate === "list") {
      collected.push(value);
      finalExpression = `{ ${collected.join(", ")} } (${collected.length})`;
      accumulator = { label: label ?? "Collected", value: finalExpression };
    }

    const isLast = index === values.length - 1;
    return frame(
      { ...strip, accumulator },
      noteFor(value, index),
      { cursor: isLast ? null : value },
    );
  });

  return { frames, finalExpression };
}

/**
 * Traverse the strip (or just its highlighted numbers), spotlighting each one
 * in turn. This is what makes "highlight multiples of 5" followed by "now
 * traverse them" — or a single compound request — actually show motion: the
 * highlight is the static answer, the traversal is the class watching it get
 * confirmed one number at a time.
 */
export function traverseStrip(
  strip: StripInput,
  subset: "all" | "highlighted",
  accumulate: AccumulateMode,
  label?: string,
): CountingOpResult {
  const all = valuesInStrip(strip.total, strip.order);
  const values =
    subset === "highlighted"
      ? all.filter((n) => strip.highlights.some((h) => n % h.of === 0))
      : all;

  if (values.length === 0) {
    return refuse(
      strip,
      subset === "highlighted"
        ? "Nothing is highlighted yet — highlight something first, then traverse it."
        : "There is nothing to traverse.",
    );
  }

  const result = traverseValues(strip, values, {
    accumulate,
    label,
    noteFor: (value) => `Visiting ${value}.`,
  });

  const countLabel = subset === "highlighted" ? `the ${values.length} highlighted numbers` : `all ${values.length} numbers`;
  const accumulateNote =
    accumulate === "none" ? "" : ` — ${result.finalExpression}`;

  return {
    frames: result.frames,
    summary: `Traversed ${countLabel}${accumulateNote}.`,
  };
}

export function clearAccumulator(strip: StripInput): CountingOpResult {
  if (!strip.accumulator) return refuse(strip, "Nothing is being shown beside the strip right now.");
  const next: StripInput = { ...strip, accumulator: null };
  return {
    frames: [frame(next, "Cleared the result panel.")],
    summary: "Cleared the result panel.",
  };
}

// ── Extraction ──────────────────────────────────────────────────────────

/**
 * Pull every number matching a highlight rule out of the main row into its
 * own tray — "bring out the highlighted elements". Purely a display flag; the
 * strip's actual highlights are unchanged, so un-extracting shows the same
 * numbers back in place.
 */
export function extractHighlighted(strip: StripInput): CountingOpResult {
  if (strip.highlights.length === 0) {
    return refuse(strip, "Nothing is highlighted yet — highlight something first, then bring it out.");
  }
  if (strip.extracted) return refuse(strip, "The highlighted numbers are already pulled out.");
  const next: StripInput = { ...strip, extracted: true };
  return {
    frames: [frame(next, "Pulling the highlighted numbers out of the list.")],
    summary: "Pulled the highlighted numbers out into their own group.",
  };
}

export function collapseExtraction(strip: StripInput): CountingOpResult {
  if (!strip.extracted) return refuse(strip, "Nothing is pulled out right now.");
  const next: StripInput = { ...strip, extracted: false };
  return {
    frames: [frame(next, "Putting the numbers back into the list.")],
    summary: "Put the highlighted numbers back into the strip.",
  };
}

// ── Factorial divisibility (Legendre's formula) ───────────────────────────

/**
 * Walks the class through finding the highest power of prime `p` dividing
 * `n!` — the CAT-style "how many trailing zeros in 945!" / "does 7^30 divide
 * 200!" question. One beat per power level (multiples of p, then p², then
 * p³, …): the strip re-highlights to just that power's multiples and a
 * running total builds beside it — the highlight-and-count method a teacher
 * works through by hand, never just the final number.
 */
function legendreWalk(strip: StripInput, n: number, p: number, labelFor: (n: number, p: number) => string) {
  const terms = legendreTerms(n, p);
  const total = terms.reduce((sum, t) => sum + t.count, 0);
  const base: StripInput = { total: n, order: "ascending", mode: "list", highlights: [], division: null };

  const frames: CountingFrame[] = terms.map((term, index) => {
    const runningTerms = terms.slice(0, index + 1);
    const runningTotal = runningTerms.reduce((sum, t) => sum + t.count, 0);
    const rule: HighlightRule = { id: `legendre-${term.divisor}`, label: `Multiples of ${term.divisor}`, of: term.divisor };
    return frame(
      { ...base, highlights: [rule] },
      term.power === 1
        ? `Multiples of ${p} among 1..${n}: ${term.count} of them — each contributes one factor of ${p}.`
        : `Multiples of ${term.divisor} (${p}^${term.power}): ${term.count} of them — each contributes ONE MORE factor of ${p}, already counted once at the level below.`,
      { cursor: null, accumulator: { label: labelFor(n, p), value: formatLegendreExpression(n, runningTerms, runningTotal) } },
    );
  });

  const expression = formatLegendreExpression(n, terms, total);
  const closing = frame(
    { ...base, highlights: [] },
    `${n}! contains exactly ${p}^${total} — no more, no less.`,
    { cursor: null, accumulator: { label: labelFor(n, p), value: expression } },
  );

  return { frames: [...frames, closing], total, expression };
}

export function explainTrailingZeros(strip: StripInput, n: number): CountingOpResult {
  const error = totalError(n);
  if (error) return refuse(strip, error);

  // A trailing zero needs a factor of 10 = 2×5. Every factorial has far more
  // factors of 2 than 5 (every other number is even; only every fifth is a
  // multiple of 5), so the count of 5s is always the bottleneck — that is
  // why only multiples of 5 get highlighted here, never multiples of 2.
  const { frames, total, expression } = legendreWalk(strip, n, 5, (value) => `Trailing zeros in ${value}! =`);
  return {
    frames,
    summary: `${n}! ends in ${total} trailing zeros (${expression}). The 2s were never the bottleneck — a factorial always has far more even numbers than multiples of 5.`,
  };
}

export function explainFactorialDivisibility(
  strip: StripInput,
  n: number,
  p: number,
  targetExponent?: number,
): CountingOpResult {
  const nError = totalError(n);
  if (nError) return refuse(strip, nError);
  if (!isPrime(p)) {
    return refuse(
      strip,
      `${p} is not prime — this method (highlight multiples of p, then p², then p³…) only gives the exact exponent for a PRIME base. For a composite base, break it into its prime factors first.`,
    );
  }
  if (p > n) {
    return refuse(strip, `${p} is larger than ${n}, so it does not divide into ${n}! at all — its exponent is 0.`);
  }

  const { frames, total, expression } = legendreWalk(strip, n, p, (value, prime) => `Highest power of ${prime} in ${value}! =`);

  let verdict = `The highest power of ${p} dividing ${n}! is ${p}^${total}.`;
  if (targetExponent !== undefined) {
    verdict =
      total >= targetExponent
        ? `Yes — ${p}^${targetExponent} divides ${n}! exactly, since ${n}! contains ${p}^${total} and ${total} is at least ${targetExponent}. ${total - targetExponent} factors of ${p} are left over.`
        : `No — ${p}^${targetExponent} does NOT divide ${n}! evenly: ${n}! only contains ${p}^${total}, short by ${targetExponent - total} factors of ${p}.`;
  }

  return {
    frames,
    summary: `${verdict} (${expression})`,
  };
}
