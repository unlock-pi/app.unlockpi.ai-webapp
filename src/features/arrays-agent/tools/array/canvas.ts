import { tool } from "ai";
import { z } from "zod";

import { COMPLEXITY, frame } from "@/features/arrays-agent/lib/array-frames";
import {
  fail,
  report,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";

export function createCanvasTools(ctx: ArrayToolContext) {
  const array = () => ctx.state.array;

  /** Highlight tools differ only in which indices they light up. */
  const spotlight = (indices: number[], note: string) => {
    ctx.play({
      values: array().values,
      frames: [frame(array().values, note, { active: indices })],
      summary: note,
    });
    return report(ctx, note);
  };

  return {
    highlight_element: tool({
      description:
        "Put the spotlight on one cell without reading or changing it. Use for 'highlight index 2', 'point at the third one', 'look at this element'.",
      inputSchema: z.object({
        index: z.number().int().describe("Zero-based index to highlight."),
      }),
      execute: async ({ index }) => {
        const { values } = array();
        if (index < 0 || index >= values.length) {
          return fail(ctx, `Index ${index} is out of bounds — valid indices are 0 to ${values.length - 1}.`);
        }
        ctx.patch({ selectedIndex: index });
        return spotlight([index], `Highlighting index ${index}.`);
      },
    }),

    highlight_range: tool({
      description:
        "Spotlight a contiguous run of cells. Use for 'highlight indices 1 through 3', 'show the first half', 'look at this section'.",
      inputSchema: z.object({
        start: z.number().int().describe("Zero-based first index, inclusive."),
        end: z.number().int().describe("Zero-based last index, inclusive."),
      }),
      execute: async ({ start, end }) => {
        const { values } = array();
        const low = Math.max(0, Math.min(start, end));
        const high = Math.min(values.length - 1, Math.max(start, end));
        if (values.length === 0 || low > high) {
          return fail(ctx, `Cannot highlight ${start} to ${end} on an array of ${values.length} elements.`);
        }
        const indices = Array.from({ length: high - low + 1 }, (_, offset) => low + offset);
        return spotlight(indices, `Highlighting indices ${low} through ${high}.`);
      },
    }),

    animate_operation: tool({
      description:
        "Replay a single low-level movement so the class can watch it in isolation. Use when the teacher asks 'show me that shift again' or 'animate moving index 2 to index 3'. For real edits use the insert/delete tools instead — this only illustrates.",
      inputSchema: z.object({
        operation: z
          .enum(["shift", "swap", "copy"])
          .describe("shift = slide one element, swap = exchange two, copy = duplicate into another slot."),
        from: z.number().int().describe("Zero-based source index."),
        to: z.number().int().describe("Zero-based destination index."),
      }),
      execute: async ({ operation, from, to }) => {
        const { values, name } = array();
        const inBounds = (index: number) => index >= 0 && index < values.length;
        if (!inBounds(from) || !inBounds(to)) {
          return fail(ctx, `Indices must be between 0 and ${values.length - 1}.`);
        }

        const next = [...values];
        let note: string;
        if (operation === "swap") {
          [next[from], next[to]] = [next[to], next[from]];
          note = `Swap ${values[from]} at index ${from} with ${values[to]} at index ${to}.`;
        } else {
          next[to] = values[from];
          note =
            operation === "shift"
              ? `Shift ${values[from]} from index ${from} into index ${to}, overwriting ${values[to]}.`
              : `Copy ${values[from]} from index ${from} into index ${to}.`;
        }

        ctx.play({
          values: next,
          frames: [
            frame(values, `Watch index ${from}.`, { active: [from] }),
            frame(next, note, { active: [from, to], found: to }),
          ],
          summary: note,
        });
        return report(ctx, `${name}: ${note}`);
      },
    }),

    show_index: tool({
      description:
        "Turn the index row under the array on or off, or point at one index. Use for 'show the indices', 'hide the index numbers', 'what index is that'.",
      inputSchema: z.object({
        visible: z.boolean().optional().describe("True shows the index row, false hides it."),
        index: z
          .number()
          .int()
          .optional()
          .describe("Optionally also point at this index while showing the row."),
      }),
      execute: async ({ visible, index }) => {
        const show = visible ?? true;
        ctx.patch({ showIndices: show });
        if (typeof index === "number") {
          ctx.patch({ selectedIndex: index });
          return spotlight([index], `Indices ${show ? "shown" : "hidden"}; pointing at index ${index}.`);
        }
        return report(ctx, `Index row is now ${show ? "visible" : "hidden"}.`);
      },
    }),

    show_complexity: tool({
      description:
        "Show the time and space complexity of an array operation, with the reason. Use for 'explain the time complexity', 'how expensive is inserting at the front', 'what's the big O of this'.",
      inputSchema: z.object({
        operation: z
          .enum(Object.keys(COMPLEXITY) as [string, ...string[]])
          .describe("Which operation's cost to show."),
      }),
      execute: async ({ operation }) => {
        const complexity = COMPLEXITY[operation];
        if (!complexity) return fail(ctx, `No complexity is recorded for ${operation}.`);
        ctx.overlay({ kind: "complexity", operation, complexity });
        return report(
          ctx,
          `${operation.replace(/_/g, " ")} is ${complexity.time} time and ${complexity.space} space. ${complexity.reason}`,
          { complexity },
        );
      },
    }),

    show_explanation: tool({
      description:
        "Put a short written explanation on the board beside the array. Use when the teacher asks 'why did the elements shift', 'explain that', 'write that down for the class'.",
      inputSchema: z.object({
        title: z.string().describe("Short heading, e.g. 'Why did the elements shift?'"),
        content: z.string().describe("Two or three sentences in plain classroom language."),
      }),
      execute: async ({ title, content }) => {
        ctx.overlay({ kind: "explanation", title, content });
        return report(ctx, `Showing the explanation "${title}" beside the array.`);
      },
    }),

    reset_canvas: tool({
      description:
        "Clear highlights, markers and side panels but KEEP the array itself. Use for 'clear the highlights', 'reset the view', 'start that again'.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.resetCanvas();
        return report(ctx, "Cleared highlights and panels. The array is still on the board.");
      },
    }),

    clear_canvas: tool({
      description:
        "Remove the array and everything around it, leaving an empty board. Use ONLY for 'clear everything', 'wipe the board', 'start from scratch'.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.clearCanvas();
        return report(ctx, "Board cleared. There is no array on it now.");
      },
    }),
  };
}
