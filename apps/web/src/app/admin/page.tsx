import {
  ActivityIcon,
  AudioWaveformIcon,
  CoinsIcon,
  LayoutDashboardIcon,
  UsersIcon,
} from "lucide-react";

import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { ActivityChart } from "@/features/admin/components/activity-chart";
import { MetricCard } from "@/features/admin/components/metric-card";
import { RangeFilter } from "@/features/admin/components/range-filter";
import { SessionsTable } from "@/features/admin/components/sessions-table";
import { getAdminDashboardData } from "@/features/admin/lib/admin-data";
import { resolveRangeStart } from "@/features/admin/lib/range";
import { formatCost, formatMinutes, formatNumber } from "@/features/admin/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range = "30" } = await searchParams;
  const data = await getAdminDashboardData();
  const start = resolveRangeStart(range);
  const inRange = (iso: string) => !start || new Date(iso) >= start;

  const sessions = data.realtimeSessions.filter((s) => inRange(s.startedAt));
  const activeIds = new Set(
    data.users
      .filter((u) => u.lastActiveAt && inRange(u.lastActiveAt))
      .map((u) => u.id),
  );
  const activity = data.activity.filter(
    (d) => !start || new Date(`${d.date}T23:59:59`) >= start,
  );
  const spend = sessions.reduce((t, s) => t + (s.estimatedCostUsd ?? 0), 0);
  const durationSeconds = sessions.reduce((t, s) => t + s.durationSeconds, 0);

  return (
    <>
      <AdminPageHeader
        title="Overview"
        // icon={LayoutDashboardIcon}
        // description="Tutor activity, classroom AI usage, and spend at a glance."
        action={<RangeFilter value={range} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={UsersIcon}
          label="Total tutors"
          value={formatNumber(data.users.length)}
          detail={`${activeIds.size} active in range`}
        />
        <MetricCard
          icon={ActivityIcon}
          label="Active tutors"
          value={formatNumber(activeIds.size)}
        />
        <MetricCard
          icon={AudioWaveformIcon}
          label="AI sessions"
          value={formatNumber(sessions.length)}
          detail={`${formatMinutes(durationSeconds)} of class`}
        />
        <MetricCard
          icon={CoinsIcon}
          label="Est. spend"
          value={formatCost(spend)}
          detail="Realtime sessions"
        />
      </div>

      <div className="mt-5">
        <ActivityChart data={activity} />
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Recent sessions
        </p>
        {/* Overview shows a fixed "latest 10" preview — the full paginated
            list lives on /admin/sessions. */}
        <SessionsTable
          sessions={sessions.slice(0, 10)}
          users={data.users}
          page={1}
          pageSize={10}
          total={Math.min(sessions.length, 10)}
        />
      </div>
    </>
  );
}
