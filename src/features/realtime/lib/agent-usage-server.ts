/**
 * The row an agent tool call becomes.
 *
 * Split out of the route so it can be tested against the migration: every
 * failure mode of this feature is silent (the client posts fire-and-forget,
 * the insert is logged but not surfaced), so a column name that drifts from
 * the schema would simply stop recording credits with nothing to notice.
 */
export type AgentToolCallInput = {
  usageSessionId: string;
  callId: string;
  responseId?: string | null;
  agent?: string;
  toolName: string;
  ok?: boolean;
  durationMs?: number;
};

/** Longest values the columns are meant to hold; anything longer is trimmed. */
const MAX_AGENT_CHARS = 40;
const MAX_TOOL_CHARS = 80;

export function buildAgentToolCallRow(input: AgentToolCallInput, ownerId: string) {
  return {
    usage_session_id: input.usageSessionId,
    owner_id: ownerId,
    call_id: input.callId,
    response_id: input.responseId ?? null,
    agent: (input.agent?.trim() || "unknown").slice(0, MAX_AGENT_CHARS),
    tool_name: input.toolName.trim().slice(0, MAX_TOOL_CHARS),
    // Anything other than an explicit false counts as a successful call, so a
    // surface that forgets to send the flag under-reports failures rather
    // than inventing them.
    ok: input.ok !== false,
    duration_ms: positiveInteger(input.durationMs),
  };
}

function positiveInteger(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value ?? 0)) : 0;
}
