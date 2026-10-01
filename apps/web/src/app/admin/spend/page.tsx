import { CoinsIcon, ImageIcon, AudioWaveformIcon, SparklesIcon } from "lucide-react";

import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { DailySpendChart } from "@/features/admin/components/daily-spend-chart";
import { MetricCard } from "@/features/admin/components/metric-card";
import { RangeFilter } from "@/features/admin/components/range-filter";
import {
  SpendBreakdown,
  type SpendCategory,
} from "@/features/admin/components/spend-view";
import { getAdminDashboardData } from "@/features/admin/lib/admin-data";
import { formatCost, formatNumber } from "@/features/admin/lib/format";
import { resolveRangeStart } from "@/features/admin/lib/range";
import { aggregateVisualSpend } from "@/features/admin/lib/spend-aggregate";
import {
  buildDailySpendSeries,
  resolveChartDays,
} from "@/features/admin/lib/spend-series";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  image: "Images",
  mermaid: "Diagrams",
};

export default async function AdminSpendPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range = "30" } = await searchParams;
  const data = await getAdminDashboardData();
  const start = resolveRangeStart(range);

  const sessions = data.realtimeSessions.filter(
    (s) => !start || new Date(s.startedAt) >= start,
  );
  const visuals = data.visualGenerations.filter(
    (v) => !start || new Date(v.createdAt) >= start,
  );

  const realtimeByModel = new Map<string, { cost: number; count: number }>();
  for (const session of sessions) {
    const entry = realtimeByModel.get(session.model) ?? { cost: 0, count: 0 };
    entry.cost += session.estimatedCostUsd ?? 0;
    entry.count += 1;
    realtimeByModel.set(session.model, entry);
  }
  const realtimeCategories: SpendCategory[] = Array.from(
    realtimeByModel.entries(),
  )
    .map(([model, entry]) => ({
      label: model,
      group: "Realtime" as const,
      cost: entry.cost,
      count: entry.count,
    }))
    .sort((a, b) => b.cost - a.cost);

  const visualsRollup = aggregateVisualSpend(visuals);
  const visualsCategories: SpendCategory[] = visualsRollup.byKind
    .map((kind) => ({
      label: KIND_LABELS[kind.kind] ?? kind.kind,
      group: "Visuals" as const,
      cost: kind.costUsd,
      count: kind.count,
    }))
    .sort((a, b) => b.cost - a.cost);

  const realtimeCost = sessions.reduce((t, s) => t + (s.estimatedCostUsd ?? 0), 0);
  const totalCost = realtimeCost + visualsRollup.totalCostUsd;

  // Sessions/generations we couldn't price at all — these silently drag the
  // total DOWN, so surface them instead of letting the number look complete
  // when it isn't. Split by cause: a genuinely missing rate card (fixable by
  // adding one) vs. historical sessions where usage was never captured due to
  // the ai_realtime_responses RLS bug (fixed 2026-08-03 — nothing to add, the
  // token data for these specific rows is simply gone).
  const untrackedSessions = sessions.filter(
    (s) => s.pricingVersion === "no-usage-captured",
  );
  const unpricedSessions = sessions.filter(
    (s) => s.estimatedCostUsd === null && s.pricingVersion !== "no-usage-captured",
  );
  const unpricedModels = [...new Set(unpricedSessions.map((s) => s.model))];
  const unpricedVisuals = visuals.filter((v) => v.costUsd === null);
  const unpricedVisualModels = [
    ...new Set(unpricedVisuals.map((v) => v.modelTier ?? v.kind)),
  ];

  const dailySeries = buildDailySpendSeries({
    sessions,
    visuals,
    days: resolveChartDays(range),
  });

  return (
    <>
      <AdminPageHeader
        title="Spend"
        icon={CoinsIcon}
        // description="Realtime classroom AI and visual generation, tracked separately."
        action={<RangeFilter value={range} />}
      />

      {untrackedSessions.length > 0 ? (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-sm font-medium text-warning">
            {untrackedSessions.length} historical session
            {untrackedSessions.length === 1 ? "" : "s"} have no usage data — the
            total below is understated for these.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            An RLS bug (fixed 2026-08-03) blocked usage tracking before this
            date, so the token counts for these sessions were never captured
            and can&apos;t be recovered. Sessions from now on are unaffected.
          </p>
        </div>
      ) : null}

      {unpricedModels.length > 0 ? (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-sm font-medium text-warning">
            {unpricedSessions.length} session
            {unpricedSessions.length === 1 ? "" : "s"} could not be priced — the
            total below is understated.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            No rate card for:{" "}
            <span className="font-mono">{unpricedModels.join(", ")}</span>. Add
            it to{" "}
            <span className="font-mono">
              src/features/realtime/lib/realtime-pricing.ts
            </span>{" "}
            or set <span className="font-mono">REALTIME_PRICING_OVERRIDES</span>.
          </p>
        </div>
      ) : null}

      {unpricedVisuals.length > 0 ? (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-sm font-medium text-warning">
            {unpricedVisuals.length} generation
            {unpricedVisuals.length === 1 ? "" : "s"} could not be priced — the
            total below is understated.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            No rate card for:{" "}
            <span className="font-mono">{unpricedVisualModels.join(", ")}</span>.
            Add it to{" "}
            <span className="font-mono">
              src/features/visuals/lib/generation-pricing.ts
            </span>{" "}
            or set <span className="font-mono">GENERATION_PRICING_OVERRIDES</span>.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CoinsIcon}
          label="Total spend"
          value={formatCost(totalCost)}
          detail="Realtime + visuals"
        />
        <MetricCard
          icon={AudioWaveformIcon}
          label="Realtime"
          value={formatCost(realtimeCost)}
          detail={`${formatNumber(sessions.length)} sessions`}
        />
        <MetricCard
          icon={ImageIcon}
          label="Visuals"
          value={formatCost(visualsRollup.totalCostUsd)}
          detail={`${formatNumber(visualsRollup.totalGenerations)} generations`}
        />
        <MetricCard
          icon={SparklesIcon}
          label="Generations"
          value={formatNumber(visualsRollup.totalGenerations)}
        />
      </div>

      <div className="mt-5">
        <DailySpendChart
          data={dailySeries}
          description="Hover a bar for that day's exact spend. "
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SpendBreakdown
          categories={realtimeCategories}
          title="Realtime — by model"
          emptyLabel="No realtime sessions recorded in this range."
        />
        <SpendBreakdown
          categories={visualsCategories}
          title="Visuals — by kind"
          emptyLabel="No visual generations recorded in this range."
        />
      </div>
    </>
  );
}
