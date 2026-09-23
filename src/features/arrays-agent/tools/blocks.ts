import { tool } from "ai";
import { z } from "zod";

import {
  fail,
  report,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";

/**
 * Editing the frame itself — the text and code blocks from the editor's left
 * panel, reachable by voice while presenting.
 *
 * These are grouped behind `type`/`target` enums rather than split into one
 * tool per block kind. Nine near-identical tools measurably hurt a realtime
 * model's tool choice; three with a clear enum do not, and the enum doubles
 * as documentation of what the board can hold.
 */
export function createBlockTools(ctx: ArrayToolContext) {
  const NO_CANVAS =
    "This board is not a canvas frame, so there are no blocks to edit.";

  return {
    add_block: tool({
      description:
        "Add a block to the frame the class is looking at — a heading, a subheading, a paragraph, or a code block. Use for 'add a heading', 'put a title on this slide', 'write a note under it', 'show me the code for this'. If the frame is full a new frame is created and the block goes there.",
      inputSchema: z.object({
        type: z
          .enum(["heading", "subheading", "body", "code"])
          .describe(
            "heading = the frame's main title line; subheading = secondary line; body = a paragraph; code = a code sample.",
          ),
        text: z
          .string()
          .optional()
          .describe("The text, for heading, subheading and body."),
        code: z.string().optional().describe("The source, for a code block."),
        language: z
          .string()
          .optional()
          .describe("Language for a code block, e.g. javascript, python. Defaults to javascript."),
        explanation: z
          .string()
          .optional()
          .describe("One line shown under a code block explaining what it does."),
      }),
      execute: async ({ type, text, code, language, explanation }) => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        if (type !== "code" && !text?.trim()) {
          return fail(ctx, `Say what the ${type} should say.`);
        }
        return report(
          ctx,
          ctx.blocks.add({ type, text, code, language, explanation }),
        );
      },
    }),

    add_frame: tool({
      description:
        "Create a NEW frame after the one showing and move to it. Use for 'create a new frame', 'add a slide', 'give me a blank frame', 'new page', 'start a fresh frame'. Set copy_current to duplicate the current frame's contents instead of starting empty ('copy this slide', 'duplicate this frame'). This is the only way to make a frame — going to the last frame is NOT the same thing.",
      inputSchema: z.object({
        title: z
          .string()
          .optional()
          .describe("Name for the new frame, e.g. 'Binary search'. Optional."),
        copy_current: z
          .boolean()
          .optional()
          .describe("True duplicates the current frame's blocks into the new one."),
      }),
      execute: async ({ title, copy_current }) => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        return report(ctx, ctx.blocks.addFrame({ title, copyCurrent: copy_current }));
      },
    }),

    update_text: tool({
      description:
        "Rewrite the heading, subheading, paragraph, or the frame's own title on the frame now showing. Use for 'change the subheading to X', 'retitle this slide', 'reword that paragraph'. If the frame has no such block yet, one is added.",
      inputSchema: z.object({
        target: z
          .enum(["heading", "subheading", "body", "frame_title"])
          .describe(
            "frame_title is the frame's name in the deck; heading/subheading/body are blocks shown on it.",
          ),
        text: z.string().min(1).describe("The new text."),
      }),
      execute: async ({ target, text }) => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        return report(ctx, ctx.blocks.update(target, text));
      },
    }),

    remove_block: tool({
      description:
        "Remove one block from the frame now showing. Use for 'delete the subheading', 'take the code block off this slide'. Only use when the teacher clearly asks to remove something.",
      inputSchema: z.object({
        target: z
          .enum(["heading", "subheading", "body", "code", "array", "stack"])
          .describe("Which block to remove from the current frame."),
      }),
      execute: async ({ target }) => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        const message = ctx.blocks.remove(target);
        // Without this the agent would keep describing — and editing — an
        // array that is no longer on the frame.
        if (target === "array" || target === "stack") ctx.clearCanvas();
        return report(ctx, message);
      },
    }),

    show_array_as_code: tool({
      description:
        "Show the code under the array and keep the two in sync from then on. The block shows the declaration (A = [1, 2, 3]) and, after each operation, the line that performed it (A.splice(2, 0, 10)) with the explanation. Use for 'show the code', 'show the code and array together', 'what does this look like in Python'. If the teacher already wrote a code block on the frame, theirs is used and their style is kept. Python shows Python (A.insert(2, 10)); Java, C and C++ show the declaration only, since their arrays are fixed-size.",
      inputSchema: z.object({
        language: z
          .enum(["javascript", "typescript", "python", "java", "cpp", "c"])
          .default("javascript")
          .describe("Language to render the array in."),
      }),
      execute: async ({ language }) => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        if (ctx.state.array.values.length === 0) {
          return fail(ctx, "There is no array on the board yet to mirror in code.");
        }
        return report(ctx, ctx.blocks.linkCode(language));
      },
    }),

    hide_code: tool({
      description:
        "Remove the code block from the frame, leaving the array on its own. Use for 'hide the code', 'just the array', 'take the code away'.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        return report(ctx, ctx.blocks.hideCode());
      },
    }),

    sync_array_from_code: tool({
      description:
        "Read the array literal out of the code block on this frame and make the board's array match it. Use when the teacher has edited the code and says 'update the array from the code', 'make the array match this code'.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!ctx.blocks) return fail(ctx, NO_CANVAS);
        const parsed = ctx.blocks.readCodeArray();
        if (!parsed) {
          return fail(
            ctx,
            "I could not find an array literal in the code block. It needs a line like `let A = [1, 2, 3];`.",
          );
        }
        ctx.ensureArray(parsed.values, parsed.name ?? ctx.state.array.name);
        return report(
          ctx,
          `Updated the array from the code: [${parsed.values.join(", ")}].`,
        );
      },
    }),
  };
}
