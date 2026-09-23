/**
 * Records one tool call an agent made.
 *
 * The cost itself is reported by OpenAI per RESPONSE, not per tool call, so
 * this row does not carry money — it carries which tool ran, for which
 * tutor, inside which response. The admin panel joins it to the response's
 * usage and splits that bill across the calls it contained.
 *
 * Fire-and-forget with `keepalive`, exactly like `trackRealtimeResponse`: a
 * lesson must never wait on bookkeeping, and a failed post must never break
 * the tool the teacher just asked for. Failures are logged loudly, because a
 * silent one would show up much later as "the tool numbers look low".
 */
export type AgentToolCallEvent = {
  usageSessionId: string | null;
  /** OpenAI's function call id — the key that stops a retry double-counting. */
  callId: string;
  /** The response this call was made inside, when the surface can tell. */
  responseId: string | null;
  /** Which tutor or surface ran it: arrays, stacks, canvas-copilot, course-arrays. */
  agent: string;
  toolName: string;
  ok: boolean;
  durationMs: number;
};

export function trackAgentToolCall(event: AgentToolCallEvent) {
  if (!event.usageSessionId) {
    // No session row means no cost tracking at all for this lesson; the
    // response tracker already warns about that, so stay quiet here rather
    // than logging twice per tool call.
    return;
  }
  if (!event.callId || !event.toolName) return;

  void fetch("/api/openai/realtime/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "tool",
      usageSessionId: event.usageSessionId,
      callId: event.callId,
      responseId: event.responseId,
      agent: event.agent,
      toolName: event.toolName,
      ok: event.ok,
      durationMs: Math.max(0, Math.round(event.durationMs)),
    }),
    keepalive: true,
  })
    .then(async (response) => {
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error(
          `[agent usage] Server rejected the tool-call record (${response.status}). Check that supabase/migrations/20260919_agent_tool_calls.sql has been applied.`,
          body,
        );
      }
    })
    .catch((error) => {
      console.error("[agent usage] Tool-call record failed to send:", error);
    });
}
