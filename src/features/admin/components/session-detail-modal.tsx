"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminRealtimeSession, AdminUser } from "@/features/admin/types/admin-types";

interface SessionDetailModalProps {
  session: AdminRealtimeSession | null;
  user?: AdminUser;
  onClose: () => void;
}

export function SessionDetailModal({
  session,
  user,
  onClose,
}: SessionDetailModalProps) {
  if (!session) return null;

  const totalTokens = session.inputTokens + session.outputTokens;
  const costPerToken = session.estimatedCostUsd
    ? (session.estimatedCostUsd / totalTokens) * 1000000
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b flex items-center justify-between p-6">
          <div>
            <CardTitle className="text-lg">{session.lessonTitle}</CardTitle>
            <CardDescription className="mt-1">
              Session on{" "}
              {new Date(session.startedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <section>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-[0.12em] text-muted-foreground">
              Session Details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Tutor</p>
                <p className="font-medium">{user?.name ?? "Unknown"}</p>
                {user?.email && (
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="font-medium capitalize">{session.source}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Model</p>
                <p className="font-medium">{session.model}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mode</p>
                <p className="font-medium capitalize">
                  {session.mode.replaceAll("_", " ")}
                </p>
              </div>
            </div>
          </section>

          {/* Session Metrics */}
          <section className="border-t pt-6">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-[0.12em] text-muted-foreground">
              Performance Metrics
            </h3>
            <div className="grid gap-3">
              <MetricRow
                label="Duration"
                value={formatDuration(session.durationSeconds)}
              />
              <MetricRow
                label="AI Responses"
                value={session.responseCount.toString()}
              />
              <MetricRow
                label="Input Tokens"
                value={session.inputTokens.toLocaleString()}
              />
              <MetricRow
                label="Output Tokens"
                value={session.outputTokens.toLocaleString()}
              />
              <MetricRow
                label="Total Tokens"
                value={totalTokens.toLocaleString()}
              />
              <MetricRow
                label="Tokens per Minute"
                value={
                  session.durationSeconds > 0
                    ? ((totalTokens / session.durationSeconds) * 60).toFixed(1)
                    : "—"
                }
              />
            </div>
          </section>

          {/* Cost Breakdown */}
          <section className="border-t pt-6">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-[0.12em] text-muted-foreground">
              Cost Analysis
            </h3>
            <div className="grid gap-3 mb-4">
              <MetricRow
                label="Total Cost"
                value={formatCost(session.estimatedCostUsd)}
                highlight
              />
              <MetricRow
                label="Cost per Token"
                value={`$${(costPerToken).toFixed(4)}`}
              />
              <MetricRow
                label="Cost per Minute"
                value={
                  session.durationSeconds > 0
                    ? `$${(
                        (session.estimatedCostUsd ?? 0) /
                        (session.durationSeconds / 60)
                      ).toFixed(2)}`
                    : "—"
                }
              />
            </div>
            <div className="bg-muted p-4 rounded-lg text-xs text-muted-foreground space-y-1">
              <p>
                <span className="font-medium text-foreground">Note:</span> Costs
                shown are estimates based on model pricing at session time.
              </p>
              <p>Actual costs may vary based on LiveKit Realtime billing.</p>
            </div>
          </section>

          {/* Session Status */}
          <section className="border-t pt-6">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-[0.12em] text-muted-foreground">
              Status
            </h3>
            <div className="grid gap-3">
              <MetricRow
                label="Status"
                value={session.status}
                badge={
                  session.status === "completed"
                    ? "success"
                    : session.status === "error"
                      ? "danger"
                      : "secondary"
                }
              />
              <MetricRow
                label="Started"
                value={new Date(session.startedAt).toLocaleString()}
              />
              {session.endedAt && (
                <MetricRow
                  label="Ended"
                  value={new Date(session.endedAt).toLocaleString()}
                />
              )}
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}

function MetricRow({
  label,
  value,
  highlight,
  badge,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  badge?: "success" | "danger" | "secondary";
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 px-3 rounded ${
        highlight ? "bg-muted" : ""
      }`}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {badge && (
          <div
            className={`text-xs font-medium px-2 py-1 rounded ${
              badge === "success"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : badge === "danger"
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            }`}
          >
            {value}
          </div>
        )}
        {!badge && (
          <span className={highlight ? "font-semibold" : "font-medium"}>
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatCost(value: number | null) {
  return value === null
    ? "Not configured"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: value < 1 ? 4 : 2,
        maximumFractionDigits: value < 1 ? 4 : 2,
      }).format(value);
}
