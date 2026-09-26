/**
 * The agent's working memory for one class — see arrays-agent's agent-memory.ts
 * for the full rationale. Short version: a realtime session's context window
 * is finite, so this keeps a small, bounded record on our side and re-sends
 * it as ONE message that replaces its previous copy, so the agent still knows
 * what is on the board and what it already did even after older turns are
 * trimmed.
 */
export type MemoryEntry = {
  tool: string;
  ok: boolean;
  summary: string;
};

/** Enough to answer "what did you just do", small enough to cost almost nothing. */
export const MAX_MEMORY_ENTRIES = 12;
const MAX_SUMMARY_CHARS = 140;
const MAX_STATE_CHARS = 1200;

export function appendMemory(entries: MemoryEntry[], entry: MemoryEntry): MemoryEntry[] {
  const summary =
    entry.summary.length > MAX_SUMMARY_CHARS
      ? `${entry.summary.slice(0, MAX_SUMMARY_CHARS - 1)}…`
      : entry.summary;
  return [...entries, { ...entry, summary }].slice(-MAX_MEMORY_ENTRIES);
}

export function buildLiveContext(input: { boardState: string; memory: MemoryEntry[] }): string {
  const boardState =
    input.boardState.length > MAX_STATE_CHARS
      ? `${input.boardState.slice(0, MAX_STATE_CHARS - 1)}…`
      : input.boardState;

  const memory = input.memory.length
    ? input.memory
        .map((entry, index) => `${index + 1}. ${entry.tool}${entry.ok ? "" : " (refused)"} — ${entry.summary}`)
        .join("\n")
    : "Nothing yet.";

  return [
    "LIVE CONTEXT — the current truth. It replaces any earlier LIVE CONTEXT; if older messages disagree, trust this.",
    "",
    `ON THE BOARD NOW: ${boardState}`,
    "",
    "WHAT YOU HAVE DONE THIS CLASS (oldest first):",
    memory,
  ].join("\n");
}
