import { tool } from "ai";
import { z } from "zod";

import { report, type CountingToolContext } from "@/features/counting-agent/tools/tool-context";

export function createCanvasTools(ctx: CountingToolContext) {
  return {
    reset_canvas: tool({
      description:
        "Clear highlights, division and side notes but KEEP the strip's size and order. Use for 'clear the highlights', 'reset the view', 'start that again'.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.resetCanvas();
        return report(ctx, "Cleared highlights and division. The strip is still there.");
      },
    }),

    clear_canvas: tool({
      description:
        "Remove the strip and every other block from the frame now showing, leaving it empty. Use for 'clear the frame', 'clear the canvas', 'wipe the board', 'start from scratch'.",
      inputSchema: z.object({}),
      execute: async () => {
        const message = ctx.blocks?.clearFrame();
        ctx.clearCanvas();
        return report(ctx, message ?? "Cleared the strip. This board has no other blocks to remove.");
      },
    }),
  };
}
