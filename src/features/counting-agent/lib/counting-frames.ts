import type {
  Accumulator,
  CountingFrame,
  Division,
  HighlightRule,
  Mode,
  Order,
  View,
} from "@/features/counting-agent/lib/counting-types";

/**
 * Hard cap so a voice command can never ask for something the strip cannot
 * render usefully. Generous — the strip is a pagination-style truncation, not
 * a fixed grid, so it stays readable at any of these sizes.
 */
export const MAX_TOTAL = 1000;
export const MIN_TOTAL = 1;

export function frame(
  strip: {
    total: number;
    order: Order;
    mode: Mode;
    highlights: HighlightRule[];
    division: Division;
    cursor?: number | null;
    accumulator?: Accumulator;
    extracted?: boolean;
    view?: View;
    gridPage?: number;
  },
  note: string,
  overrides: {
    cursor?: number | null;
    accumulator?: Accumulator;
    extracted?: boolean;
    view?: View;
    gridPage?: number;
  } = {},
): CountingFrame {
  return {
    total: strip.total,
    order: strip.order,
    mode: strip.mode,
    highlights: strip.highlights.map((h) => ({ ...h })),
    division: strip.division ? { ...strip.division } : null,
    cursor: overrides.cursor !== undefined ? overrides.cursor : (strip.cursor ?? null),
    accumulator: overrides.accumulator !== undefined ? overrides.accumulator : (strip.accumulator ?? null),
    extracted: overrides.extracted !== undefined ? overrides.extracted : (strip.extracted ?? false),
    view: overrides.view !== undefined ? overrides.view : (strip.view ?? "strip"),
    gridPage: overrides.gridPage !== undefined ? overrides.gridPage : (strip.gridPage ?? 0),
    note,
  };
}

/** The strip's numbers in display order — what a traversal walks across. */
export function valuesInStrip(total: number, order: Order): number[] {
  const values = Array.from({ length: total }, (_, i) => i + 1);
  return order === "descending" ? values.reverse() : values;
}

/**
 * BigInt-exact, but a 1000-term product's digit count would swamp a caption —
 * past this many digits the value is shown as leading digits + digit count
 * rather than the full number.
 */
const MAX_RESULT_DIGITS = 21;

export function formatBigResult(value: bigint): string {
  const text = value.toString();
  if (text.length <= MAX_RESULT_DIGITS) return text;
  return `${text.slice(0, MAX_RESULT_DIGITS - 3)}… (${text.length} digits)`;
}

/**
 * The running expression shown in the accumulator chip, e.g. "1 × 2 × 3 = 6".
 * Long traversals show only the ends — the strip itself already truncates the
 * same way, so this reads as the same visual language.
 */
export function formatExpression(terms: string[], joiner: string, result: string): string {
  const shown =
    terms.length > 7
      ? [...terms.slice(0, 4), "⋯", ...terms.slice(-2)]
      : terms;
  return `${shown.join(` ${joiner} `)} = ${result}`;
}

/** Clamp and round a requested total into the strip's supported range. */
export function clampTotal(total: number): number {
  return Math.max(MIN_TOTAL, Math.min(MAX_TOTAL, Math.round(total)));
}

export function totalError(total: number): string | null {
  if (!Number.isFinite(total)) return "That is not a number.";
  if (Math.round(total) < MIN_TOTAL || Math.round(total) > MAX_TOTAL) {
    return `A strip must have between ${MIN_TOTAL} and ${MAX_TOTAL} numbers.`;
  }
  return null;
}

export function divisorError(divisor: number): string | null {
  if (!Number.isInteger(divisor)) return "The divisor must be a whole number.";
  if (divisor <= 0) return "The divisor must be greater than zero.";
  return null;
}

export function isPrime(value: number): boolean {
  if (!Number.isInteger(value) || value < 2) return false;
  for (let i = 2; i * i <= value; i++) {
    if (value % i === 0) return false;
  }
  return true;
}

/**
 * Legendre's formula: the exponent of prime `p` in `n!` is
 * ⌊n/p⌋ + ⌊n/p²⌋ + ⌊n/p³⌋ + … — each term counts multiples of that power of
 * p among 1..n, because a multiple of p² contributes a SECOND factor of p
 * beyond the one already counted at the p¹ level, and so on.
 */
export type LegendreTerm = { power: number; divisor: number; count: number };

export function legendreTerms(n: number, p: number): LegendreTerm[] {
  const terms: LegendreTerm[] = [];
  let divisor = p;
  let power = 1;
  while (divisor <= n) {
    terms.push({ power, divisor, count: Math.floor(n / divisor) });
    divisor *= p;
    power += 1;
  }
  return terms;
}

/** e.g. "⌊200/5⌋ + ⌊200/25⌋ + ⌊200/125⌋ = 40 + 8 + 1 = 49". */
export function formatLegendreExpression(n: number, terms: LegendreTerm[], total: number): string {
  const floors = terms.map((t) => `⌊${n}/${t.divisor}⌋`).join(" + ");
  const counts = terms.map((t) => String(t.count)).join(" + ");
  return `${floors} = ${counts} = ${total}`;
}
