import type { AdminVisualGeneration } from "@/features/admin/types/admin-types";

export type VisualSpendRollup = {
  totalCostUsd: number;
  totalGenerations: number;
  byOwner: Record<string, { count: number; costUsd: number }>;
  byKind: { kind: string; count: number; costUsd: number }[];
};

/**
 * Aggregate a list of visual generations into totals/by-owner/by-kind rollups.
 * Pure function so it can run over the full lifetime list (admin-data.ts) or a
 * date/owner-filtered slice of it (any page that needs a scoped view).
 */
export function aggregateVisualSpend(
  visuals: AdminVisualGeneration[],
): VisualSpendRollup {
  const byOwner: Record<string, { count: number; costUsd: number }> = {};
  const byKindMap = new Map<string, { count: number; costUsd: number }>();
  let totalCostUsd = 0;

  for (const generation of visuals) {
    const cost = generation.costUsd ?? 0;
    totalCostUsd += cost;

    const owner = (byOwner[generation.ownerId] ??= { count: 0, costUsd: 0 });
    owner.count += 1;
    owner.costUsd += cost;

    const kind = byKindMap.get(generation.kind) ?? { count: 0, costUsd: 0 };
    kind.count += 1;
    kind.costUsd += cost;
    byKindMap.set(generation.kind, kind);
  }

  return {
    totalCostUsd,
    totalGenerations: visuals.length,
    byOwner,
    byKind: Array.from(byKindMap.entries()).map(([kind, value]) => ({
      kind,
      ...value,
    })),
  };
}
