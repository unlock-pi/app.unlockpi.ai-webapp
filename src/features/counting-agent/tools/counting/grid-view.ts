import { tool } from "ai";
import { z } from "zod";

import { goToHundredBlock, setView, stepHundredBlock } from "@/features/counting-agent/lib/counting-ops";
import { commit, type CountingToolContext } from "@/features/counting-agent/tools/tool-context";

export function createGridViewTools(ctx: CountingToolContext) {
  return {
    show_as_grid: tool({
      description:
        "Switch the board from the horizontal strip to a rows-and-columns grid (a 'population of N' table, 10x10 per block). Use for 'show them in rows and columns', 'put this in a table', 'show it as a grid'. A thousand numbers can't fit on one grid, so it paginates in blocks of 100 — go_to_next_hundred / go_to_previous_hundred / go_to_hundred_block move between them. Highlighting, division, and traversal all still work in grid view.",
      inputSchema: z.object({}),
      execute: async () => commit(ctx, setView(ctx.state.strip, "grid")),
    }),

    show_as_strip: tool({
      description: "Switch back from the grid to the horizontal pagination strip. Use for 'go back to the strip', 'show it as a line again'.",
      inputSchema: z.object({}),
      execute: async () => commit(ctx, setView(ctx.state.strip, "strip")),
    }),

    go_to_hundred_block: tool({
      description:
        "Jump the grid straight to a specific block of 100 (1-indexed) — 'go to the third hundred', 'show me 201 to 300'. Switches to grid view if not already there.",
      inputSchema: z.object({
        block: z.number().int().min(1).describe("Which hundred, 1-indexed — 1 means 1-100, 2 means 101-200, and so on."),
      }),
      execute: async ({ block }) => commit(ctx, goToHundredBlock(ctx.state.strip, block)),
    }),

    go_to_next_hundred: tool({
      description: "Move the grid to the next block of 100. Use for 'next hundred', 'show me the next block', 'go forward'.",
      inputSchema: z.object({}),
      execute: async () => commit(ctx, stepHundredBlock(ctx.state.strip, 1)),
    }),

    go_to_previous_hundred: tool({
      description: "Move the grid back to the previous block of 100. Use for 'go back', 'previous hundred'.",
      inputSchema: z.object({}),
      execute: async () => commit(ctx, stepHundredBlock(ctx.state.strip, -1)),
    }),
  };
}
