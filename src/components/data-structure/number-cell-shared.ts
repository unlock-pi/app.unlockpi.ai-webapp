/**
 * Pure helpers shared by the two number-visualization components —
 * `NumberPaginationStrip` (the horizontal pagination strip) and `NumberGrid`
 * (the rows-and-columns table). Deliberately just types and pure functions,
 * no components: the two visualizations stay independent, but a highlight
 * rule and its color mean the same thing in either one.
 */

/** One combinable highlight rule. A number can match several at once. */
export type HighlightRule = {
  id: string;
  label: string;
  predicate: (value: number) => boolean;
  /** Tailwind classes for the cell's ring/fill when only this rule matches. */
  colorClass?: string;
};

export const DEFAULT_RULE_COLORS = [
  "border-primary/60 bg-primary text-primary-foreground",
  "border-amber-500/60 bg-amber-500 text-white",
  "border-emerald-500/60 bg-emerald-500 text-white",
  "border-fuchsia-500/60 bg-fuchsia-500 text-white",
];

/** Every rule matching `value`, in rule order. */
export function matchesFor(value: number, highlights: HighlightRule[]): HighlightRule[] {
  return highlights.filter((rule) => rule.predicate(value));
}

export function colorFor(rule: HighlightRule, index: number): string {
  return rule.colorClass ?? DEFAULT_RULE_COLORS[index % DEFAULT_RULE_COLORS.length];
}

export function gradientStop(rule: HighlightRule, index: number): string {
  if (rule.colorClass) return "var(--primary)";
  const palette = ["var(--primary)", "#f59e0b", "#10b981", "#d946ef"];
  return palette[index % palette.length];
}
