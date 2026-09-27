import { tool } from "ai";
import { z } from "zod";

import { fail, report, type TopologyToolContext } from "@/features/topologies/tools/tool-context";

/**
 * Editing the frame's own text blocks — a thin mirror of the counting
 * agent's `tools/blocks.ts`. Present only when Mesh is running inside the
 * canvas (`ctx.blocks` is undefined on the standalone demo page), so these
 * tools fail cleanly there rather than disappearing from the schema.
 */
export function createBlockTools(ctx: TopologyToolContext) {
  const NO_CANVAS = "This board is not a canvas frame, so there are no text blocks to edit.";

  return {
    add_block: tool({
      description:
        "Add a block to the frame the class is looking at — a heading, a subheading, or a paragraph explaining the topology. " +
        "Use for 'add a heading', 'title this slide', 'write a note under the diagram'.",
      inputSchema: z.object({
        type: z.enum(["heading", "subheading", "body"]),
        text: z.string().describe("The text for the block."),
      }),
      execute: async ({ type, text }) => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        if (!text.trim()) return fail(ctx, `Say what the ${type} should say.`);
        return report(ctx, ctx.blocks.add({ type, text }));
      },
    }),

    update_text: tool({
      description: "Rewrite the heading, subheading, paragraph, or the frame's own title. Adds the block if it doesn't exist yet.",
      inputSchema: z.object({
        target: z.enum(["heading", "subheading", "body", "frame_title"]),
        text: z.string().min(1),
      }),
      execute: async ({ target, text }) => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        return report(ctx, ctx.blocks.update(target, text));
      },
    }),

    remove_block: tool({
      description: "Remove one block from the frame now showing. Only when the teacher clearly asks to remove something.",
      inputSchema: z.object({ target: z.enum(["heading", "subheading", "body", "board"]) }),
      execute: async ({ target }) => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        const message = ctx.blocks.remove(target);
        if (target === "board") ctx.clearCanvas();
        return report(ctx, message);
      },
    }),

    add_frame: tool({
      description: "Create a new frame after the current one and move to it. Set copy_current to duplicate the current frame instead.",
      inputSchema: z.object({
        title: z.string().optional(),
        copy_current: z.boolean().optional(),
      }),
      execute: async ({ title, copy_current }) => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        return report(ctx, ctx.blocks.addFrame({ title, copyCurrent: copy_current }));
      },
    }),
  };
}
