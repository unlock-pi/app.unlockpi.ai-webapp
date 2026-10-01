import { UsersIcon } from "lucide-react";

import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { RangeFilter } from "@/features/admin/components/range-filter";
import { UsersTable } from "@/features/admin/components/users-table";
import { getAdminDashboardData } from "@/features/admin/lib/admin-data";
import { resolvePage } from "@/features/admin/lib/admin-pagination";
import { RANGE_OPTIONS, resolveRangeStart } from "@/features/admin/lib/range";
import { aggregateVisualSpend } from "@/features/admin/lib/spend-aggregate";
import { buildUserStatsMap } from "@/features/admin/lib/user-stats";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; page?: string }>;
}) {
  const { range = "30", page: pageParam } = await searchParams;
  const page = resolvePage(pageParam);
  const data = await getAdminDashboardData();
  const start = resolveRangeStart(range);

  const sessions = data.realtimeSessions.filter(
    (s) => !start || new Date(s.startedAt) >= start,
  );
  const visuals = data.visualGenerations.filter(
    (v) => !start || new Date(v.createdAt) >= start,
  );
  const statsByUser = buildUserStatsMap(
    sessions,
    aggregateVisualSpend(visuals).byOwner,
  );

  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.value === range)?.label.toLowerCase() ??
    "the selected range";

  return (
    <>
      <AdminPageHeader
        title="Users"
        icon={UsersIcon}
        // description={`${data.users.length} tutors. Spend and generations shown for ${rangeLabel}.`}
        action={<RangeFilter value={range} />}
      />
      <UsersTable users={data.users} statsByUser={statsByUser} page={page} />
    </>
  );
}
