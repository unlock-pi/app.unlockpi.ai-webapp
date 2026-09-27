/**
 * Range options + resolver. Server-safe (no "use client") so server components
 * can import `resolveRangeStart` directly. The client <RangeFilter> just reads
 * RANGE_OPTIONS from here.
 */

export const RANGE_OPTIONS = [
  { value: "1", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
] as const;

export type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

/** Resolve `?range=` to a start Date (or null for all-time). */
export function resolveRangeStart(range: string | undefined): Date | null {
  if (range === "all") return null;
  const days = Number(range);
  const validDays = Number.isFinite(days) && days > 0 ? days : 30;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (validDays - 1));
  return start;
}
