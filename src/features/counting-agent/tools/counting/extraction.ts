import { tool } from "ai";
import { z } from "zod";

import { collapseExtraction, extractHighlighted } from "@/features/counting-agent/lib/counting-ops";
import { commit, type CountingToolContext } from "@/features/counting-agent/tools/tool-context";

export function createExtractionTools(ctx: CountingToolContext) {
  return {
    extract_highlighted: tool({
      description:
        "Pull every currently-highlighted number physically out of the strip into its own group below it, so the class sees them separated from the rest of the list — not just colored differently. Use for 'bring out the highlighted numbers', 'pull those out', 'show me just the ones that matched', 'separate them from the list'. Requires highlight_multiples to have run first — highlight, then extract.",
      inputSchema: z.object({}),
      execute: async () => commit(ctx, extractHighlighted(ctx.state.strip)),
    }),

    return_to_strip: tool({
      description:
        "Put the pulled-out numbers back into the main strip. Use for 'put them back', 'merge them back in', 'undo that split'.",
      inputSchema: z.object({}),
      execute: async () => commit(ctx, collapseExtraction(ctx.state.strip)),
    }),
  };
}
