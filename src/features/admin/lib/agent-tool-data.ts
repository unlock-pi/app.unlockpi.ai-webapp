import type {
  AdminAgentToolCall,
  AdminResponseCost,
} from "@/features/admin/types/admin-types";
import { createAdminClient } from "@/lib/supabase-admin";

/**
 * Everything the agent-tools page needs, in three reads.
 *
 * Kept separate from `getAdminDashboardData` on purpose: that function lists
 * every auth user and every visual generation, which this page does not need
 * and should not wait for. Nothing here touches the tables the existing
 * admin pages read from except to look up the responses that priced these
 * calls.
 */

const MAX_CALLS = 5000;
/** Postgres `in (...)` lists get unwieldy long before this; chunk instead. */
const ID_CHUNK = 200;

export type AgentToolUsage = {
  calls: AdminAgentToolCall[];
  responses: AdminResponseCost[];
  /** Lesson and model for each session the calls came from. */
  sessions: Map<string, { lessonTitle: string; model: string; mode: string }>;
  /** Display name per owner id, for the per-teacher rollup. */
  ownerNames: Map<string, string>;
  /** True when the table itself is missing — the migration has not been run. */
  tableMissing: boolean;
};

export async function getAgentToolUsage(since: Date | null): Promise<AgentToolUsage> {
  const admin = createAdminClient();

  let callQuery = admin
    .from("ai_agent_tool_calls")
    .select(
      "id, usage_session_id, owner_id, response_id, agent, tool_name, ok, duration_ms, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(MAX_CALLS);
  if (since) callQuery = callQuery.gte("created_at", since.toISOString());

  const callsResult = await callQuery;

  if (callsResult.error) {
    // A missing table is the one error worth surviving: it means the migration
    // has not been applied yet, and the page should say so rather than 500.
    const missing =
      callsResult.error.code === "42P01" ||
      /relation .*ai_agent_tool_calls.* does not exist/i.test(callsResult.error.message);
    if (!missing) throw callsResult.error;
    return {
      calls: [],
      responses: [],
      sessions: new Map(),
      ownerNames: new Map(),
      tableMissing: true,
    };
  }

  const calls: AdminAgentToolCall[] = (callsResult.data ?? []).map((row) => ({
    id: row.id,
    usageSessionId: row.usage_session_id,
    ownerId: row.owner_id,
    responseId: row.response_id,
    agent: row.agent,
    toolName: row.tool_name,
    ok: row.ok,
    durationMs: Number(row.duration_ms),
    createdAt: row.created_at,
  }));

  const sessionIds = [...new Set(calls.map((call) => call.usageSessionId))];
  const ownerIds = [...new Set(calls.map((call) => call.ownerId))];

  const [responseRows, sessionRows, profileRows] = await Promise.all([
    chunked(sessionIds, async (ids) => {
      const { data, error } = await admin
        .from("ai_realtime_responses")
        .select(
          "usage_session_id, response_id, input_text_tokens, input_audio_tokens, output_text_tokens, output_audio_tokens, estimated_cost_usd",
        )
        .in("usage_session_id", ids);
      if (error) throw error;
      return data ?? [];
    }),
    chunked(sessionIds, async (ids) => {
      const { data, error } = await admin
        .from("ai_realtime_sessions")
        .select("id, lesson_title, model, mode")
        .in("id", ids);
      if (error) throw error;
      return data ?? [];
    }),
    chunked(ownerIds, async (ids) => {
      const { data, error } = await admin
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      if (error) throw error;
      return data ?? [];
    }),
  ]);

  return {
    calls,
    responses: responseRows.map((row) => ({
      usageSessionId: row.usage_session_id,
      responseId: row.response_id,
      inputTokens: Number(row.input_text_tokens) + Number(row.input_audio_tokens),
      outputTokens: Number(row.output_text_tokens) + Number(row.output_audio_tokens),
      costUsd:
        row.estimated_cost_usd === null ? null : Number(row.estimated_cost_usd),
    })),
    sessions: new Map(
      sessionRows.map((row) => [
        row.id as string,
        {
          lessonTitle: row.lesson_title as string,
          model: row.model as string,
          mode: row.mode as string,
        },
      ]),
    ),
    ownerNames: new Map(
      profileRows
        .filter((row) => row.display_name)
        .map((row) => [row.user_id as string, row.display_name as string]),
    ),
    tableMissing: false,
  };
}

async function chunked<Row>(
  ids: string[],
  read: (ids: string[]) => Promise<Row[]>,
): Promise<Row[]> {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += ID_CHUNK) {
    chunks.push(ids.slice(index, index + ID_CHUNK));
  }
  const results = await Promise.all(chunks.map(read));
  return results.flat();
}
