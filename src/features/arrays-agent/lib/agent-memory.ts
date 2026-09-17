/**
 * The agent's working memory for one class.
 *
 * A realtime session keeps the conversation on OpenAI's side, but the context
 * window is finite: audio, tool schemas and tool results all fill it, and
 * once it is full the oldest turns are dropped. That is when the agent
 * "forgets" what it did a few minutes ago.
 *
 * This keeps a small, bounded record on our side and re-sends it as ONE
 * message that replaces its previous copy, so however much of the
 * conversation gets trimmed, the agent still knows: which frame is showing,
 * what is on it, what the array is, and what it has already done.
 */
export type MemoryEntry = {
  frame: string | null;
  tool: string;
  ok: boolean;
  summary: string;
};

/** Enough to answer "what did you just do", small enough to cost almost nothing. */
export const MAX_MEMORY_ENTRIES = 12;
const MAX_SUMMARY_CHARS = 140;
const MAX_FRAME_CHARS = 2400;

export function appendMemory(entries: MemoryEntry[], entry: MemoryEntry): MemoryEntry[] {
  const summary =
    entry.summary.length > MAX_SUMMARY_CHARS
      ? `${entry.summary.slice(0, MAX_SUMMARY_CHARS - 1)}…`
      : entry.summary;
  return [...entries, { ...entry, summary }].slice(-MAX_MEMORY_ENTRIES);
}

/** "Frame 2 of 4: …" → "frame 2", so each memory line says where it happened. */
export function frameLabel(frameDescription: string | null | undefined): string | null {
  const match = frameDescription ? /Frame (\d+)/.exec(frameDescription) : null;
  return match ? `frame ${match[1]}` : null;
}

export function buildLiveContext(input: {
  frame: string | null;
  arrayState: string;
  memory: MemoryEntry[];
}): string {
  const frame = input.frame
    ? input.frame.length > MAX_FRAME_CHARS
      ? `${input.frame.slice(0, MAX_FRAME_CHARS - 1)}…`
      : input.frame
    : "No presentation frame — this is a standalone board.";

  const memory = input.memory.length
    ? input.memory
        .map(
          (entry, index) =>
            `${index + 1}. ${entry.frame ? `[${entry.frame}] ` : ""}${entry.tool}${entry.ok ? "" : " (refused)"} — ${entry.summary}`,
        )
        .join("\n")
    : "Nothing yet.";

  return [
    "LIVE CONTEXT — the current truth. It replaces any earlier LIVE CONTEXT; if older messages disagree, trust this.",
    "",
    "ON SCREEN NOW:",
    frame,
    "",
    `ARRAY YOU ARE WORKING WITH: ${input.arrayState}`,
    "",
    "WHAT YOU HAVE DONE THIS CLASS (oldest first):",
    memory,
  ].join("\n");
}
