import type { RealtimeUsageResponse } from "@/features/realtime/types/realtime-usage";

/**
 * Records one AI response's token usage.
 *
 * Every early-return here used to be silent, which made "cost isn't tracking"
 * impossible to diagnose — the failure left no trace anywhere. They now warn
 * loudly in the browser console so the broken link is identifiable.
 */
export function trackRealtimeResponse(
  usageSessionId: string | null,
  response: RealtimeUsageResponse | undefined,
) {
  if (!usageSessionId) {
    console.warn(
      "[realtime usage] No usage session id — the session row was never created, so this response's cost cannot be recorded. Check the /api/openai/realtime/canvas server logs.",
    );
    return;
  }
  if (!response?.id) {
    console.warn(
      "[realtime usage] response.done arrived without response.id — skipping cost tracking.",
      response,
    );
    return;
  }
  if (!response.usage) {
    console.warn(
      "[realtime usage] response.done arrived without a usage payload — OpenAI reported no token counts for this response, so it cannot be priced.",
      response,
    );
    return;
  }

  void fetch("/api/openai/realtime/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "response",
      usageSessionId,
      responseId: response.id,
      usage: response.usage,
    }),
    keepalive: true,
  })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(
          `[realtime usage] Server rejected the usage record (${res.status}).`,
          body,
        );
      }
    })
    .catch((error) => {
      console.error("[realtime usage] Request failed:", error);
    });
}

export function finishRealtimeUsageSession(
  usageSessionId: string | null,
  status: "completed" | "failed" = "completed",
) {
  if (!usageSessionId) return;

  void fetch("/api/openai/realtime/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "finish", usageSessionId, status }),
    keepalive: true,
  });
}
