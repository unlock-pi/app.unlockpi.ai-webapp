/**
 * Copilot panel generation — shared types + prompts.
 *
 * The panel is where the AI *writes* during class: explanations, diagrams,
 * tables, code. It never touches the teacher's authored frames, so generating
 * here can't corrupt the deck. Kept as plain data so it's easy to read and add
 * new panel item types later.
 */

import { z } from "zod";

export type PanelItemType = "explanation" | "mermaid" | "table" | "code";

export type PanelItemStatus = "pending" | "ready" | "error";

export type CopilotPanelItem = {
  id: string;
  type: PanelItemType;
  /** Short label shown in the item header, e.g. "Binary search". */
  topic: string;
  status: PanelItemStatus;
  /** Explanation markdown / mermaid source / markdown table / code. */
  content?: string;
  /** Language, for code items. */
  language?: string;
  createdAt: number;
};

/** What the realtime model sends when it calls show_in_panel. */
export type PanelGenerateRequest = {
  type: PanelItemType;
  topic: string;
  prompt?: string;
  /** Compact description of the current frame, so output stays relevant. */
  frameContext?: string;
};

/** Structured shape we ask the model for when generating code. */
export const codeResultSchema = z.object({
  language: z.string().describe("Lowercase language id, e.g. python, javascript, sql."),
  code: z.string().describe("The code only — no explanation, no markdown fences."),
});

export type CodeResult = z.infer<typeof codeResultSchema>;

/**
 * System prompts per panel type. These are tuned for *live teaching* — short,
 * clear, no preamble, because the class is watching it appear in real time.
 */
export function buildPanelSystemPrompt(type: PanelItemType): string {
  const shared =
    "You are a silent classroom assistant generating supporting material that appears on a side panel during a live lesson. Be accurate and concise. Never add preamble, sign-off, or meta commentary.";

  if (type === "explanation") {
    return [
      shared,
      "Explain the requested concept for students in 2-4 short sentences or up to 4 short bullet points.",
      "Plain classroom language. Output Markdown. Use bullets (lines starting with '- ') when listing.",
    ].join(" ");
  }

  if (type === "table") {
    return [
      shared,
      "Produce ONE compact Markdown table that helps teach the requested concept.",
      "Keep it to at most 4 columns and 6 rows. Output only the table, nothing else.",
    ].join(" ");
  }

  // code
  return [
    shared,
    "Produce one short, correct, idiomatic code example for the requested concept.",
    "Keep it under 25 lines. Prefer the most common language for the topic unless one is specified.",
  ].join(" ");
}
