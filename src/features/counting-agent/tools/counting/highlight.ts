import { tool } from "ai";
import { z } from "zod";

import { addHighlight, clearHighlights } from "@/features/counting-agent/lib/counting-ops";
import { commit, type CountingToolContext } from "@/features/counting-agent/tools/tool-context";

export function createHighlightTools(ctx: CountingToolContext) {
  return {
    highlight_multiples: tool({
      description:
        "Add a highlight rule marking every multiple of a number. Use for 'highlight multiples of 5'. ADDS to whatever is already highlighted — for 'highlight multiples of 2 and multiples of 5' call this tool twice, once per number, never with a list. Numbers matching more than one active rule (e.g. multiples of both 2 and 5, which are multiples of 10) get a combined marker on the board.",
      inputSchema: z.object({
        of: z.number().int().min(1).describe("Highlight every multiple of this number."),
        label: z.string().optional().describe("Optional label for this rule. Defaults to 'Multiples of N'."),
      }),
      execute: async ({ of, label }) => commit(ctx, addHighlight(ctx.state.strip, of, label)),
    }),

    clear_highlights: tool({
      description: "Remove every highlight rule. Use for 'clear the highlights', 'unhighlight everything'.",
      inputSchema: z.object({}),
      execute: async () => commit(ctx, clearHighlights(ctx.state.strip)),
    }),
  };
}
