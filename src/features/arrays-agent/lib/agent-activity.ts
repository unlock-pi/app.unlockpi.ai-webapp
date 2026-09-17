/**
 * The session's observable behaviour, as a log.
 *
 * A voice agent is opaque: when it does nothing you cannot tell whether it
 * failed to hear you, heard you and picked no tool, or picked a tool that
 * silently refused. Each of those needs a different fix, so each gets its own
 * event here.
 */
export type AgentEvent =
  | { kind: "status"; at: number; text: string }
  | { kind: "heard"; at: number; text: string }
  | { kind: "said"; at: number; text: string }
  | {
      kind: "tool";
      at: number;
      name: string;
      ok: boolean;
      durationMs: number;
      summary: string;
      args: string;
    }
  | { kind: "thinking"; at: number; latencyMs: number }
  | { kind: "error"; at: number; text: string };

export type AgentLatency = {
  /** Speech end → model started responding. "Did it understand me?" */
  responseMs: number | null;
  /** Slowest tool this session, in our own code. */
  slowestToolMs: number | null;
  /** Rolling mean of response latency. */
  averageResponseMs: number | null;
  toolCalls: number;
  toolFailures: number;
};

export const EMPTY_LATENCY: AgentLatency = {
  responseMs: null,
  slowestToolMs: null,
  averageResponseMs: null,
  toolCalls: 0,
  toolFailures: 0,
};

/** Keeps the log bounded — a long class would otherwise grow without limit. */
export const MAX_EVENTS = 60;

export function appendEvent(events: AgentEvent[], event: AgentEvent): AgentEvent[] {
  return [...events, event].slice(-MAX_EVENTS);
}

/** Compact one-line description of a tool's arguments, for the log. */
export function summarizeArgs(argumentsJson: string): string {
  try {
    const parsed = JSON.parse(argumentsJson || "{}") as Record<string, unknown>;
    const entries = Object.entries(parsed);
    if (entries.length === 0) return "";
    return entries
      .map(([key, value]) => `${key}=${Array.isArray(value) ? `[${value.join(",")}]` : String(value)}`)
      .join(" ")
      .slice(0, 80);
  } catch {
    return argumentsJson.slice(0, 80);
  }
}

export function describeLatency(ms: number | null): string {
  if (ms === null) return "—";
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Latency bands for the response clock. The thresholds are about perception,
 * not networking: under a second feels immediate in a classroom, past three
 * the teacher has already started wondering whether it heard them.
 */
export function latencyTone(ms: number | null): "good" | "warn" | "bad" | "idle" {
  if (ms === null) return "idle";
  if (ms < 1200) return "good";
  if (ms < 3000) return "warn";
  return "bad";
}
