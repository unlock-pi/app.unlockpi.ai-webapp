"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { TriangleAlertIcon } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  formatCost,
  formatDateTime,
  formatNumber,
  initialsOf,
} from "@/features/admin/lib/format";
import type {
  AdminRealtimeSession,
  AdminUser,
} from "@/features/admin/types/admin-types";

type SessionDetailDialogProps = {
  session: AdminRealtimeSession | null;
  user?: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SessionDetailDialog({
  session,
  user,
  open,
  onOpenChange,
}: SessionDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-lg">
        {session ? (
          <>
            <DialogHeader>
              <DialogTitle>{session.lessonTitle}</DialogTitle>
              <DialogDescription>
                {formatDateTime(session.startedAt)}
              </DialogDescription>
            </DialogHeader>

            <DialogPanel className="grid gap-4">
              {user ? (
                <Link
                  href={`/admin/users/${user.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 transition-colors hover:bg-accent"
                >
                  <Avatar className="size-9 text-xs">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                    <AvatarFallback className="bg-primary/12 font-semibold text-primary">
                      {initialsOf(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      View tutor profile →
                    </p>
                  </div>
                </Link>
              ) : null}

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
                <Stat label="Status">
                  <StatusBadge status={session.status} />
                </Stat>
                <Stat label="Estimated cost">
                  {session.estimatedCostUsd === null ? (
                    <Badge className="border-warning/30 bg-warning/10 text-warning">
                      {session.pricingVersion === "no-usage-captured"
                        ? "Tracking failed"
                        : "Unpriced model"}
                    </Badge>
                  ) : (
                    formatCost(session.estimatedCostUsd)
                  )}
                </Stat>
                <Stat label="Source">{cap(session.source)}</Stat>
                <Stat label="Mode">{cap(session.mode)}</Stat>
                <Stat label="Duration">
                  {Math.round(session.durationSeconds / 60)}m{" "}
                  {session.durationSeconds % 60}s
                </Stat>
                <Stat label="AI responses">
                  {formatNumber(session.responseCount)}
                </Stat>
                <Stat label="Input tokens">
                  {formatNumber(session.inputTokens)}
                </Stat>
                <Stat label="Output tokens">
                  {formatNumber(session.outputTokens)}
                </Stat>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Model <span className="font-mono">{session.model}</span>
                </p>
                {session.pricingVersion === "no-usage-captured" ? (
                  <p className="text-warning">
                    Usage tracking failed for this session (an RLS bug, fixed
                    2026-08-03) — no token data was ever captured, so this cost
                    is unknown, not zero.
                  </p>
                ) : session.pricingVersion?.endsWith("~duration-estimate") ? (
                  <p className="text-warning">
                    Estimated from session duration because no response token
                    usage was recorded. Treat this number as directional.
                  </p>
                ) : session.pricingVersion ? (
                  <p>
                    Priced with{" "}
                    <span className="font-mono">{session.pricingVersion}</span>
                    {session.pricingVersion.endsWith("~approx")
                      ? " — token breakdown was missing, so this is an upper-bound estimate."
                      : null}
                  </p>
                ) : (
                  <Alert variant="warning">
                    <TriangleAlertIcon />
                    <AlertTitle>Heads up!</AlertTitle>
                    <AlertDescription>
                      No rate card for this model — cost is not being tracked. Add
                    it in realtime-pricing.ts or REALTIME_PRICING_OVERRIDES.
                    </AlertDescription>
                  </Alert>
                  // <p className="text-warning">

                  // </p>
                )}
              </div>
            </DialogPanel>
          </>
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium tabular-nums">{children}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "completed" || normalized === "ended") {
    return (
      <Badge className="border-success/30 bg-success/10 text-success">
        Completed
      </Badge>
    );
  }
  if (normalized === "failed" || normalized === "error") {
    return (
      <Badge className="border-destructive/30 bg-destructive/10 text-destructive">
        Failed
      </Badge>
    );
  }
  return <Badge variant="secondary">{cap(status)}</Badge>;
}

function cap(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "—";
}
