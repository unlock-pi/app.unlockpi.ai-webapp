"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { SearchIcon, ShieldCheckIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  ADMIN_AVATAR_FALLBACK_CLASS,
  AdminDataTable,
} from "@/features/admin/components/admin-data-table";
import {
  formatCost,
  formatNumber,
  formatRelative,
  initialsOf,
} from "@/features/admin/lib/format";
import { ADMIN_PAGE_SIZE } from "@/features/admin/lib/admin-pagination";
import type { UserStats } from "@/features/admin/lib/user-stats";
import type { AdminUser } from "@/features/admin/types/admin-types";

type UserRow = AdminUser & UserStats;

export function UsersTable({
  users,
  statsByUser,
  page,
}: {
  users: AdminUser[];
  statsByUser: Record<string, UserStats>;
  page: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Search filters the full list client-side, then we slice the page from the
  // result so searching doesn't strand you on an out-of-range page.
  const allRows = useMemo<UserRow[]>(() => {
    const query = search.trim().toLowerCase();
    return users
      .filter((user) =>
        `${user.name} ${user.email}`.toLowerCase().includes(query),
      )
      .map((user) => ({
        ...user,
        ...(statsByUser[user.id] ?? {
          sessionCount: 0,
          durationSeconds: 0,
          realtimeCostUsd: 0,
          generationCount: 0,
          visualsCostUsd: 0,
          totalCostUsd: 0,
        }),
      }));
  }, [users, statsByUser, search]);

  const effectivePage = search.trim() ? 1 : page;
  const pageRows = useMemo(() => {
    const from = (effectivePage - 1) * ADMIN_PAGE_SIZE;
    return allRows.slice(from, from + ADMIN_PAGE_SIZE);
  }, [allRows, effectivePage]);

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Tutor",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <Avatar className="size-8 shrink-0 text-xs">
              <AvatarImage
                src={row.original.avatarUrl ?? undefined}
                alt={row.original.name}
              />
              <AvatarFallback className={ADMIN_AVATAR_FALLBACK_CLASS}>
                {initialsOf(row.original.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-medium">
                {row.original.name}
                {row.original.isAdmin ? (
                  <ShieldCheckIcon className="size-3.5 shrink-0 text-primary" />
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "sessionCount",
        header: "Sessions",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatNumber(row.original.sessionCount)}
          </span>
        ),
        size: 90,
      },
      {
        accessorKey: "generationCount",
        header: "Visuals",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatNumber(row.original.generationCount)}
          </span>
        ),
        size: 90,
      },
      {
        accessorKey: "totalCostUsd",
        header: "Spend",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatCost(row.original.totalCostUsd)}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: "lastActiveAt",
        header: "Last active",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatRelative(row.original.lastActiveAt)}
          </span>
        ),
        size: 110,
      },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tutors"
          className="pl-9"
        />
      </div>
      <AdminDataTable
        columns={columns}
        data={pageRows}
        page={effectivePage}
        pageSize={ADMIN_PAGE_SIZE}
        total={allRows.length}
        emptyLabel={
          search.trim() ? `No tutors match "${search}"` : "No tutors yet."
        }
        onRowClick={(user) => router.push(`/admin/users/${user.id}`)}
      />
    </div>
  );
}
