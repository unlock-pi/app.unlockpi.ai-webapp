"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  AdminRealtimeSession,
  AdminUser,
} from "@/features/admin/types/admin-types";

interface TutorProfileDrawerProps {
  user: AdminUser | null;
  sessions: AdminRealtimeSession[];
  activeUserIds: Set<string>;
  onClose: () => void;
}

export function TutorProfileDrawer({
  user,
  sessions,
  activeUserIds,
  onClose,
}: TutorProfileDrawerProps) {
  if (!user) return null;

  const userSessions = sessions.filter((s) => s.ownerId === user.id);
  const isActive = activeUserIds.has(user.id);
  const totalMinutes = Math.round(
    userSessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60
  );
  const totalCost = userSessions.reduce(
    (sum, s) => sum + (s.estimatedCostUsd ?? 0),
    0
  );
  const recentSessions = userSessions.slice(0, 5);

  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background shadow-lg flex flex-col">
        <div className="sticky top-0 border-b bg-background p-6 flex items-center justify-between">
          <h2 className="font-semibold">Tutor Profile</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Profile Header */}
          <div>
            <div className="grid size-12 place-items-center rounded-full bg-foreground text-sm font-bold text-background mb-4">
              {initials}
            </div>
            <h3 className="font-semibold text-lg">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-3 flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  isActive ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              <span className="text-xs font-medium">
                {isActive ? "Active now" : "Inactive"}
              </span>
            </div>
          </div>

          {/* Admin Badge */}
          {user.isAdmin && (
            <Badge variant="outline" className="w-fit">
              Admin
            </Badge>
          )}

          {/* Key Metrics */}
          <section className="space-y-3 border-t pt-6">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Activity
            </h4>
            <ProfileMetric label="Joined" value={formatDate(user.createdAt)} />
            <ProfileMetric
              label="Last Active"
              value={
                user.lastActiveAt
                  ? formatRelativeTime(user.lastActiveAt)
                  : "Never"
              }
            />
            <ProfileMetric
              label="Last Sign In"
              value={
                user.lastSignInAt
                  ? formatRelativeTime(user.lastSignInAt)
                  : "Never"
              }
            />
          </section>

          {/* Usage Stats */}
          <section className="space-y-3 border-t pt-6">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Usage
            </h4>
            <ProfileMetric label="AI Sessions" value={userSessions.length} />
            <ProfileMetric
              label="Classroom Time"
              value={`${totalMinutes}m`}
              detail={`${(totalMinutes / 60).toFixed(1)} hours`}
            />
            <ProfileMetric
              label="Total Spend"
              value={formatCost(totalCost)}
              detail={`${userSessions.length} sessions`}
            />
            {userSessions.length > 0 && (
              <ProfileMetric
                label="Avg Cost/Session"
                value={formatCost(totalCost / userSessions.length)}
              />
            )}
          </section>

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <section className="space-y-3 border-t pt-6">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Recent Sessions
              </h4>
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 rounded border text-sm space-y-1"
                  >
                    <p className="font-medium line-clamp-2">
                      {session.lessonTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(session.startedAt)}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span>{formatDuration(session.durationSeconds)}</span>
                      <span className="font-medium">
                        {formatCost(session.estimatedCostUsd)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Admin Actions Footer */}
        <div className="border-t p-6 space-y-2 bg-background">
          <Button variant="outline" className="w-full" size="sm">
            View Full History
          </Button>
          <Button variant="destructive" className="w-full" size="sm">
            Suspend User
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProfileMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <p className="text-sm font-medium">{value}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatCost(value: number | null) {
  return value === null || value === 0
    ? "$0.00"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: value < 1 ? 4 : 2,
        maximumFractionDigits: value < 1 ? 4 : 2,
      }).format(value);
}
