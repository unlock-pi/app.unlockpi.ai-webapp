import { AudioWaveformIcon } from "lucide-react";

import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { RangeFilter } from "@/features/admin/components/range-filter";
import { SessionsTable } from "@/features/admin/components/sessions-table";
import { getAdminDashboardData } from "@/features/admin/lib/admin-data";
import {
  ADMIN_PAGE_SIZE,
  getSessionsPage,
  resolvePage,
} from "@/features/admin/lib/admin-pagination";
import { resolveRangeStart } from "@/features/admin/lib/range";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; user?: string; page?: string }>;
}) {
  const { range = "30", user, page: pageParam } = await searchParams;
  const page = resolvePage(pageParam);
  const start = resolveRangeStart(range);

  // Only this page's rows come back from Postgres — not the whole table.
  const [{ rows, total }, data] = await Promise.all([
    getSessionsPage({ page, rangeStart: start, ownerId: user }),
    getAdminDashboardData(),
  ]);

  const focusedUser = user ? data.users.find((u) => u.id === user) : undefined;

  return (
    <>
      <AdminPageHeader
        title="AI sessions"
        icon={AudioWaveformIcon}
        description={
          focusedUser
            ? `Sessions for ${focusedUser.name}. Click a row for details.`
            : "Every realtime classroom session. Click a row for details."
        }
        action={<RangeFilter value={range} />}
      />
      <SessionsTable
        sessions={rows}
        users={data.users}
        page={page}
        pageSize={ADMIN_PAGE_SIZE}
        total={total}
      />
    </>
  );
}
