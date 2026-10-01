import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  AudioWaveformIcon,
  Clock3Icon,
  CoinsIcon,
  ImageIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DailySpendChart } from "@/features/admin/components/daily-spend-chart";
import { MetricCard } from "@/features/admin/components/metric-card";
import { RangeFilter } from "@/features/admin/components/range-filter";
import { SessionsTable } from "@/features/admin/components/sessions-table";
import { getAdminDashboardData } from "@/features/admin/lib/admin-data";
import {
  ADMIN_PAGE_SIZE,
  paginate,
  resolvePage,
} from "@/features/admin/lib/admin-pagination";
import {
  formatCost,
  formatMinutes,
  formatNumber,
  initialsOf,
} from "@/features/admin/lib/format";
import { RANGE_OPTIONS, resolveRangeStart } from "@/features/admin/lib/range";
import { aggregateVisualSpend } from "@/features/admin/lib/spend-aggregate";
import {
  buildDailySpendSeries,
  resolveChartDays,
} from "@/features/admin/lib/spend-series";
import {
  buildUserStatsMap,
  emptyUserStats,
} from "@/features/admin/lib/user-stats";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string; page?: string }>;
}) {
  const { id } = await params;
  const { range = "30", page: pageParam } = await searchParams;
  const sessionPage = resolvePage(pageParam);
  const data = await getAdminDashboardData();

  const user = data.users.find((u) => u.id === id);
  if (!user) notFound();

  // Lifetime — unaffected by the range filter below.
  const lifetimeStats =
    buildUserStatsMap(data.realtimeSessions, data.visualsSpend.byOwner)[id] ??
    emptyUserStats();

  // Range-scoped — drives the range total, the daily chart, and the session table.
  const start = resolveRangeStart(range);
  const userSessions = data.realtimeSessions.filter(
    (s) => s.ownerId === id && (!start || new Date(s.startedAt) >= start),
  );
  const userVisuals = data.visualGenerations.filter(
    (v) => v.ownerId === id && (!start || new Date(v.createdAt) >= start),
  );
  const rangeVisualsRollup = aggregateVisualSpend(userVisuals);
  const rangeRealtimeCost = userSessions.reduce(
    (total, session) => total + (session.estimatedCostUsd ?? 0),
    0,
  );
  const rangeTotalCost = rangeRealtimeCost + rangeVisualsRollup.totalCostUsd;

  const dailySeries = buildDailySpendSeries({
    sessions: userSessions,
    visuals: userVisuals,
    days: resolveChartDays(range),
  });

  // Charts/metrics above use the full range; the table below shows one page.
  const pagedUserSessions = paginate(userSessions, sessionPage);

  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.value === range)?.label ??
    "this range";

  return (
    <>
      <Button
        render={<Link href="/admin/users" />}
        variant="ghost"
        size="sm"
        className="mb-4 -mt-8 -ml-2 text-muted-foreground"
      >
        <ArrowLeftIcon className="size-4" /> All users
      </Button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-12 text-base">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
            <AvatarFallback className="bg-primary/12 font-semibold text-primary">
              {initialsOf(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              {user.name}
              {user.isAdmin ? (
                <Badge className="border-primary/30 bg-primary/10 text-primary">
                  <ShieldCheckIcon className="size-3" /> Admin
                </Badge>
              ) : null}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      {/* <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Lifetime
      </p> */}
      {/* <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CoinsIcon}
          label="Total spend"
          value={formatCost(lifetimeStats.totalCostUsd)}
          detail={`${formatCost(lifetimeStats.realtimeCostUsd)} realtime · ${formatCost(lifetimeStats.visualsCostUsd)} visuals`}
        />
        <MetricCard
          icon={AudioWaveformIcon}
          label="Sessions"
          value={formatNumber(lifetimeStats.sessionCount)}
        />
        <MetricCard
          icon={ImageIcon}
          label="Generations"
          value={formatNumber(lifetimeStats.generationCount)}
        />
        <MetricCard
          icon={Clock3Icon}
          label="Classroom time"
          value={formatMinutes(lifetimeStats.durationSeconds)}
        />
      </div> */}

      <div className="mt-8 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Spend over time
        </p>
        <RangeFilter value={range} />
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <MetricCard
          icon={CoinsIcon}
          label={`Spend — ${rangeLabel.toLowerCase()}`}
          value={formatCost(rangeTotalCost)}
          detail={`${formatCost(rangeRealtimeCost)} realtime · ${formatCost(rangeVisualsRollup.totalCostUsd)} visuals`}
        />
        <MetricCard
          icon={AudioWaveformIcon}
          label="Sessions in range"
          value={formatNumber(userSessions.length)}
        />
        <MetricCard
          icon={ImageIcon}
          label="Generations in range"
          value={formatNumber(rangeVisualsRollup.totalGenerations)}
        />
        <MetricCard
          icon={Clock3Icon}
          label="Classroom time"
          value={formatMinutes(lifetimeStats.durationSeconds)}
        />
      </div>
      <div className="mt-4">
        <DailySpendChart
          data={dailySeries}
          title="Daily spend"
          description="Hover a bar for that day's exact spend."
        />
      </div>

      <div className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Session history
        </p>
        <SessionsTable
          sessions={pagedUserSessions.rows}
          users={data.users}
          page={sessionPage}
          pageSize={ADMIN_PAGE_SIZE}
          total={pagedUserSessions.total}
        />
      </div>
    </>
  );
}
