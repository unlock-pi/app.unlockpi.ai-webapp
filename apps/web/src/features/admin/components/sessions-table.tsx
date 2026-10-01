"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ADMIN_AVATAR_FALLBACK_CLASS,
  AdminDataTable,
} from "@/features/admin/components/admin-data-table";
import { SessionDetailDialog } from "@/features/admin/components/session-detail-dialog";
import { formatCost, formatDate, initialsOf } from "@/features/admin/lib/format";
import type {
  AdminRealtimeSession,
  AdminUser,
} from "@/features/admin/types/admin-types";

export function SessionsTable({
  sessions,
  users,
  page,
  pageSize,
  total,
}: {
  sessions: AdminRealtimeSession[];
  users: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
}) {
  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );
  const [selected, setSelected] = useState<AdminRealtimeSession | null>(null);
  const [open, setOpen] = useState(false);

  const columns = useMemo<ColumnDef<AdminRealtimeSession>[]>(
    () => [
      {
        accessorKey: "ownerId",
        header: "Tutor",
        cell: ({ row }) => {
          const user = userById.get(row.original.ownerId);
          const name = user?.name ?? "Unknown";
          return (
            // Clicking the tutor jumps to their profile; stopPropagation so it
            // doesn't also open the session detail dialog.
            <Link
              href={user ? `/admin/users/${user.id}` : "#"}
              onClick={(event) => event.stopPropagation()}
              className="flex items-center gap-2.5 hover:underline"
            >
              <Avatar className="size-7 shrink-0 text-[10px]">
                <AvatarImage src={user?.avatarUrl ?? undefined} alt={name} />
                <AvatarFallback className={ADMIN_AVATAR_FALLBACK_CLASS}>
                  {initialsOf(name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium">{name}</span>
            </Link>
          );
        },
        size: 190,
      },
      {
        accessorKey: "lessonTitle",
        header: "Lesson",
        cell: ({ row }) => (
          <span className="block truncate text-muted-foreground">
            {row.original.lessonTitle}
          </span>
        ),
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">
            {row.original.source}
          </Badge>
        ),
        size: 110,
      },
      {
        accessorKey: "durationSeconds",
        header: "Duration",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {Math.round(row.original.durationSeconds / 60)}m
          </span>
        ),
        size: 90,
      },
      {
        accessorKey: "estimatedCostUsd",
        header: "Cost",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatCost(row.original.estimatedCostUsd)}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: "startedAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.startedAt)}
          </span>
        ),
        size: 120,
      },
    ],
    [userById],
  );

  return (
    <>
      <AdminDataTable
        columns={columns}
        data={sessions}
        page={page}
        pageSize={pageSize}
        total={total}
        emptyLabel="No AI sessions in this range."
        onRowClick={(session) => {
          setSelected(session);
          setOpen(true);
        }}
      />
      <SessionDetailDialog
        session={selected}
        user={selected ? userById.get(selected.ownerId) : undefined}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
