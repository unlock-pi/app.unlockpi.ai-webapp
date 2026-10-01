export type DailySpendPoint = {
  /** YYYY-MM-DD, UTC — matches the slicing convention used elsewhere (daysAgoDate). */
  date: string;
  realtimeCost: number;
  visualsCost: number;
  totalCost: number;
};

/**
 * Buckets realtime-session cost and visuals-generation cost into one point
 * per day, for the last `days` days (today inclusive). This is what answers
 * "how much did we spend on a particular day" — pass day-level data and read
 * a single bucket, or the whole series for a trend chart.
 *
 * Even for an "all time" range, cap `days` at a sane window (e.g. 90) so the
 * chart stays readable — the caller's separate range-total stat still reads
 * from the uncapped filtered list, so the true total is never wrong.
 */
export function buildDailySpendSeries({
  sessions,
  visuals,
  days,
}: {
  sessions: { startedAt: string; estimatedCostUsd: number | null }[];
  visuals: { createdAt: string; costUsd: number | null }[];
  days: number;
}): DailySpendPoint[] {
  const buckets = new Map<string, DailySpendPoint>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, { date: key, realtimeCost: 0, visualsCost: 0, totalCost: 0 });
  }

  for (const session of sessions) {
    const bucket = buckets.get(session.startedAt.slice(0, 10));
    if (!bucket) continue;
    const cost = session.estimatedCostUsd ?? 0;
    bucket.realtimeCost += cost;
    bucket.totalCost += cost;
  }

  for (const visual of visuals) {
    const bucket = buckets.get(visual.createdAt.slice(0, 10));
    if (!bucket) continue;
    const cost = visual.costUsd ?? 0;
    bucket.visualsCost += cost;
    bucket.totalCost += cost;
  }

  return Array.from(buckets.values());
}

/** Clamp a `?range=` value to a day count for the chart lookback window. */
export function resolveChartDays(range: string | undefined): number {
  if (range === "all") return 90;
  const days = Number(range);
  return Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 30;
}
