import type { AdminRealtimeSession } from "@/features/admin/types/admin-types";

export type UserStats = {
  sessionCount: number;
  durationSeconds: number;
  realtimeCostUsd: number;
  generationCount: number;
  visualsCostUsd: number;
  totalCostUsd: number;
};

const EMPTY: UserStats = {
  sessionCount: 0,
  durationSeconds: 0,
  realtimeCostUsd: 0,
  generationCount: 0,
  visualsCostUsd: 0,
  totalCostUsd: 0,
};

export function emptyUserStats(): UserStats {
  return { ...EMPTY };
}

/**
 * Combine realtime-session spend and visuals-generation spend into one
 * per-user rollup, in a single pass over sessions. This is the "how much has
 * this user spent / how many generations" data the Users table and the user
 * drilldown both need.
 */
export function buildUserStatsMap(
  sessions: AdminRealtimeSession[],
  visualsByOwner: Record<string, { count: number; costUsd: number }>,
): Record<string, UserStats> {
  const map: Record<string, UserStats> = {};
  const ensure = (id: string) => (map[id] ??= { ...EMPTY });

  for (const session of sessions) {
    const stats = ensure(session.ownerId);
    stats.sessionCount += 1;
    stats.durationSeconds += session.durationSeconds;
    stats.realtimeCostUsd += session.estimatedCostUsd ?? 0;
  }

  for (const [ownerId, visuals] of Object.entries(visualsByOwner)) {
    const stats = ensure(ownerId);
    stats.generationCount = visuals.count;
    stats.visualsCostUsd = visuals.costUsd;
  }

  for (const stats of Object.values(map)) {
    stats.totalCostUsd = stats.realtimeCostUsd + stats.visualsCostUsd;
  }

  return map;
}
