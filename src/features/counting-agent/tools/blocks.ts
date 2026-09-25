import { tool } from "ai";
import { z } from "zod";

import { fail, report, type CountingToolContext } from "@/features/counting-agent/tools/tool-context";

/**
 * Editing the frame's own text blocks. Thin mirror of
 * `arrays-agent/tools/blocks.ts`, trimmed to the counting agent's frame
 * needs (no code-sync block — the strip is not mirrored as code).
 */
export function createBlockTools(ctx: CountingToolContext) {
  const NO_CANVAS = "This board is not a canvas frame, so there are no blocks to edit.";

  return {
    add_block: tool({
      description:
        "Add a block to the frame the class is looking at — a heading, a subheading, or a paragraph. Use for 'add a heading', 'put a title on this slide', 'write a note under it'.",
      inputSchema: z.object({
        type: z.enum(["heading", "subheading", "body"]).describe("heading = the frame's main title line; subheading = secondary line; body = a paragraph."),
        text: z.string().describe("The text for the block."),
      }),
      execute: async ({ type, text }) => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        if (!text.trim()) return fail(ctx, `Say what the ${type} should say.`);
        return report(ctx, ctx.blocks.add({ type, text }));
      },
    }),

    add_frame: tool({
      description:
        "Create a NEW frame after the one showing and move to it. Use for 'create a new frame', 'add a slide'. Set copy_current to duplicate the current frame's contents instead of starting empty.",
      inputSchema: z.object({
        title: z.string().optional().describe("Name for the new frame. Optional."),
        copy_current: z.boolean().optional().describe("True duplicates the current frame's blocks into the new one."),
      }),
      execute: async ({ title, copy_current }) => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        return report(ctx, ctx.blocks.addFrame({ title, copyCurrent: copy_current }));
      },
    }),

    update_text: tool({
      description:
        "Rewrite the heading, subheading, paragraph, or the frame's own title on the frame now showing. If the frame has no such block yet, one is added.",
      inputSchema: z.object({
        target: z.enum(["heading", "subheading", "body", "frame_title"]),
        text: z.string().min(1).describe("The new text."),
      }),
      execute: async ({ target, text }) => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        return report(ctx, ctx.blocks.update(target, text));
      },
    }),

    remove_block: tool({
      description: "Remove one block from the frame now showing. Only use when the teacher clearly asks to remove something.",
      inputSchema: z.object({
        target: z.enum(["heading", "subheading", "body", "strip"]),
      }),
      execute: async ({ target }) => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        const message = ctx.blocks.remove(target);
        if (target === "strip") ctx.clearCanvas();
        return report(ctx, message);
      },
    }),
  };
}
