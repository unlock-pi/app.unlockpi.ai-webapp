import { tool } from "ai";
import { z } from "zod";

import type { TextHighlightMark } from "@/features/canvas/types/canvas-types";

/**
 * The only thing this tool set needs from a voice agent's context — every
 * agent's `BlockControls` already has these two methods (see
 * `counting-agent/tools/tool-context.ts` and `arrays-agent/tools/tool-
 * context.ts`), so `createTextHighlightTools(ctx)` spreads straight into any
 * agent's tool set (`createCountingTools`, `createArrayTools`, and whatever
 * comes next) without that agent knowing anything about text highlighting.
 */
export type TextHighlightToolContext = {
  blocks?: {
    highlight: (
      target: "heading" | "subheading" | "body",
      marks: TextHighlightMark[],
    ) => string;
    clearHighlights: (target: "heading" | "subheading" | "body") => string;
  };
};

const NO_CANVAS = "This board is not a canvas frame, so there is no text to highlight.";

const highlightMarkSchema = z.object({
  text: z
    .string()
    .min(1)
    .describe(
      "The exact word or phrase to mark, copied verbatim (same case, same spelling) from the block's own text.",
    ),
  occurrence: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      "0-based index of which occurrence to mark when this word/phrase appears more than once in the text. Defaults to the first (0).",
    ),
  category: z
    .enum(["pronoun", "transition", "structure", "custom"])
    .describe(
      "pronoun = he/she/it/they/etc; transition = a linking/transition word (however, therefore, meanwhile...); structure = a sentence-structure word you want to call out (subject, verb, connective...); custom = anything else.",
    ),
  style: z
    .enum([
      "mark",
      "highlight",
      "underline",
      "box",
      "circle",
      "strike-through",
      "crossed-off",
      "bracket",
    ])
    .optional()
    .describe(
      "Override the category's default annotation style. \"mark\" is the normal web-page way to highlight — a solid background behind the text plus a matching font color, like a highlighter pen or a <mark> tag. The rest (highlight, underline, box, circle, strike-through, crossed-off, bracket) are hand-drawn rough-notation marks — an SVG stroke around the text, which does NOT change the text's own color. Leave unset to use the category's default look.",
    ),
  color: z
    .string()
    .optional()
    .describe(
      "Override the category's default color (any CSS color) — the stroke color for a hand-drawn style, or the background for \"mark\".",
    ),
  textColor: z
    .string()
    .optional()
    .describe("Override the category's default font color. Only used when style is \"mark\"."),
  label: z.string().optional(),
});

export function createTextHighlightTools(ctx: TextHighlightToolContext) {
  return {
    highlight_text: tool({
      description:
        "Mark up specific words or phrases inside the heading, subheading, or paragraph already on the canvas — either the normal web way (\"mark\": a solid background plus a matching font color, like a highlighter pen) or a hand-drawn rough-notation style (circle, underline, box, highlight, strike-through, crossed-off, bracket). Use this for requests like 'highlight the pronouns', 'circle every transition word', 'box the subject and verb in this sentence'. YOU classify the words by category (pronoun / transition / structure / custom) and quote each one EXACTLY as it appears in the block's text, in the order you want them to appear (they reveal one after another, not all at once) — pronouns, transition words, and structure words each get a different default look automatically, so you don't need to set style/color yourself unless the teacher asks for a specific one. This REPLACES that block's current highlight set — pass every mark you want visible, not just the new ones.",
      inputSchema: z.object({
        target: z
          .enum(["heading", "subheading", "body"])
          .describe("Which text block on the active frame to mark up."),
        marks: z.array(highlightMarkSchema).min(1).max(24),
      }),
      execute: async ({ target, marks }) => {
        if (!ctx.blocks) {
          return { ok: false, summary: NO_CANVAS };
        }
        if (marks.length === 0) {
          return { ok: false, summary: "Say which words to mark." };
        }

        const prepared: TextHighlightMark[] = marks.map((mark, index) => ({
          id: `${target}-hl-${index}-${mark.text.slice(0, 16).replace(/\s+/g, "_")}`,
          order: index,
          ...mark,
        }));

        const summary = ctx.blocks.highlight(target, prepared);
        return { ok: true, summary };
      },
    }),

    clear_text_highlights: tool({
      description:
        "Remove every highlight mark from the heading, subheading, or paragraph on the active frame. Use for 'clear the highlights', 'unmark that text', 'remove the circles'.",
      inputSchema: z.object({
        target: z.enum(["heading", "subheading", "body"]),
      }),
      execute: async ({ target }) => {
        if (!ctx.blocks) {
          return { ok: false, summary: NO_CANVAS };
        }
        return { ok: true, summary: ctx.blocks.clearHighlights(target) };
      },
    }),
  };
}

export type TextHighlightToolSet = ReturnType<typeof createTextHighlightTools>;
