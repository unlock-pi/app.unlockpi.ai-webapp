import type { AdminRealtimeSession } from "@/features/admin/types/admin-types";
import { createAdminClient } from "@/lib/supabase-admin";

export const ADMIN_PAGE_SIZE = 10;

/** Parse a `?page=` value into a safe 1-based page number. */
export function resolvePage(raw: string | undefined): number {
  const page = Number(raw);
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

/**
 * True server-side pagination: fetches ONLY the requested page from Postgres
 * using `.range()`, plus an exact total via `count`. The browser therefore
 * receives ~10 rows instead of the whole table.
 */
export async function getSessionsPage({
  page,
  pageSize = ADMIN_PAGE_SIZE,
  rangeStart,
  ownerId,
}: {
  page: number;
  pageSize?: number;
  rangeStart: Date | null;
  ownerId?: string;
}): Promise<{ rows: AdminRealtimeSession[]; total: number }> {
  const admin = createAdminClient();
  const from = (page - 1) * pageSize;

  let query = admin
    .from("ai_realtime_sessions")
    .select(
      "id, owner_id, source, lesson_title, mode, model, status, started_at, ended_at, duration_seconds, response_count, input_text_tokens, input_audio_tokens, output_text_tokens, output_audio_tokens, estimated_cost_usd, pricing_version",
      { count: "exact" },
    )
    .order("started_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (rangeStart) {
    query = query.gte("started_at", rangeStart.toISOString());
  }
  if (ownerId) {
    query = query.eq("owner_id", ownerId);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows: AdminRealtimeSession[] = (data ?? []).map((session) => ({
    id: session.id,
    ownerId: session.owner_id,
    source: session.source as "canvas" | "course",
    lessonTitle: session.lesson_title,
    mode: session.mode,
    model: session.model,
    status: session.status,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    durationSeconds: Number(session.duration_seconds),
    responseCount: Number(session.response_count),
    inputTokens:
      Number(session.input_text_tokens) + Number(session.input_audio_tokens),
    outputTokens:
      Number(session.output_text_tokens) + Number(session.output_audio_tokens),
    estimatedCostUsd:
      session.estimated_cost_usd === null
        ? null
        : Number(session.estimated_cost_usd),
    pricingVersion: session.pricing_version ?? null,
  }));

  return { rows, total: count ?? 0 };
}

/** Slice an already-aggregated list for display (users need full aggregation). */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize = ADMIN_PAGE_SIZE,
): { rows: T[]; total: number } {
  const from = (page - 1) * pageSize;
  return { rows: items.slice(from, from + pageSize), total: items.length };
}
