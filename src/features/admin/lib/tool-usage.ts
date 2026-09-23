import type {
  AdminAgentToolCall,
  AdminResponseCost,
  AdminToolAttribution,
  AdminToolRollup,
} from "@/features/admin/types/admin-types";

/**
 * Turning per-response billing into per-tool-call cost.
 *
 * OpenAI prices a RESPONSE, not a tool call: one response can carry three
 * tool calls and one bill. So the honest answer to "what is this tool
 * costing us" is the response's cost shared between the calls that happened
 * inside it. That is an attribution, not a measurement, and every number
 * this module produces is labelled as one in the UI.
 *
 * Two things it deliberately refuses to do:
 *
 *   - It never prices a call whose response was not recorded. Those come
 *     back as `costUsd: null` and are counted separately, because a call
 *     that silently costs $0 would make the totals look complete when they
 *     are not.
 *   - It never attributes a response's cost to a tool call in a DIFFERENT
 *     response, even in the same session. Calls are matched on the response
 *     they were made in, and nothing else.
 */

/** A response's cost split across the calls it carried. */
export function attributeToolCosts(
  calls: AdminAgentToolCall[],
  responses: AdminResponseCost[],
): {
  attributed: AdminToolAttribution[];
  /** Responses that carried no tool call at all — the cost of talking. */
  conversationOnly: { responses: number; costUsd: number; tokens: number };
  /** Calls whose response was never recorded, so they cannot be priced. */
  unpricedCalls: number;
} {
  const byResponse = new Map<string, AdminResponseCost>();
  for (const response of responses) {
    byResponse.set(keyOf(response.usageSessionId, response.responseId), response);
  }

  // How many calls share each response, worked out before anything is priced.
  const callsPerResponse = new Map<string, number>();
  for (const call of calls) {
    if (!call.responseId) continue;
    const key = keyOf(call.usageSessionId, call.responseId);
    callsPerResponse.set(key, (callsPerResponse.get(key) ?? 0) + 1);
  }

  const attributed = calls.map((call) => {
    const key = call.responseId ? keyOf(call.usageSessionId, call.responseId) : null;
    const response = key ? byResponse.get(key) : undefined;
    const share = key ? (callsPerResponse.get(key) ?? 1) : 1;

    // No recorded response means no token counts exist for this call. Null,
    // never zero — a zero here would quietly understate the total.
    if (!response) return { ...call, costUsd: null, tokens: null, sharedWith: 0 };

    return {
      ...call,
      costUsd: response.costUsd === null ? null : response.costUsd / share,
      tokens: (response.inputTokens + response.outputTokens) / share,
      sharedWith: share - 1,
    };
  });

  // Unpriced covers both causes: no response recorded at all, and a recorded
  // response whose model has no rate card. Either way the money is unknown.
  const unpricedCalls = attributed.filter((call) => call.costUsd === null).length;

  const usedResponses = new Set(
    calls
      .filter((call) => call.responseId)
      .map((call) => keyOf(call.usageSessionId, call.responseId as string)),
  );
  const conversation = responses.filter(
    (response) => !usedResponses.has(keyOf(response.usageSessionId, response.responseId)),
  );

  return {
    attributed,
    conversationOnly: {
      responses: conversation.length,
      costUsd: conversation.reduce((total, response) => total + (response.costUsd ?? 0), 0),
      tokens: conversation.reduce(
        (total, response) => total + response.inputTokens + response.outputTokens,
        0,
      ),
    },
    unpricedCalls,
  };
}

/** Group attributed calls by anything — tool name, agent, owner. */
export function rollupToolCalls(
  attributed: AdminToolAttribution[],
  keyBy: (call: AdminToolAttribution) => string,
): AdminToolRollup[] {
  const groups = new Map<string, AdminToolRollup>();

  for (const call of attributed) {
    const key = keyBy(call);
    const entry = groups.get(key) ?? {
      key,
      calls: 0,
      failures: 0,
      costUsd: 0,
      tokens: 0,
      unpriced: 0,
      totalDurationMs: 0,
      averageDurationMs: 0,
    };

    entry.calls += 1;
    if (!call.ok) entry.failures += 1;
    if (call.costUsd === null) entry.unpriced += 1;
    else entry.costUsd += call.costUsd;
    if (call.tokens !== null) entry.tokens += call.tokens;
    entry.totalDurationMs += call.durationMs;
    groups.set(key, entry);
  }

  return [...groups.values()]
    .map((entry) => ({
      ...entry,
      averageDurationMs: entry.calls === 0 ? 0 : entry.totalDurationMs / entry.calls,
    }))
    .sort((a, b) => b.costUsd - a.costUsd || b.calls - a.calls);
}

/** The headline numbers, in the order the page shows them. */
export function summarizeToolUsage(attributed: AdminToolAttribution[]) {
  const costUsd = attributed.reduce((total, call) => total + (call.costUsd ?? 0), 0);
  const tokens = attributed.reduce((total, call) => total + (call.tokens ?? 0), 0);
  const priced = attributed.filter((call) => call.costUsd !== null);
  const failures = attributed.filter((call) => !call.ok).length;

  return {
    calls: attributed.length,
    failures,
    costUsd,
    tokens,
    /** Averaged over the calls we could actually price. */
    averageCostUsd: priced.length === 0 ? null : costUsd / priced.length,
    pricedCalls: priced.length,
  };
}

function keyOf(sessionId: string, responseId: string) {
  return `${sessionId}:${responseId}`;
}
