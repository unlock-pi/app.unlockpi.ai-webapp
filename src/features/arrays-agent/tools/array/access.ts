import { tool } from "ai";
import { z } from "zod";

import { accessArrayElement } from "@/features/arrays-agent/lib/array-ops";
import {
  commit,
  fail,
  report,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";

export function createAccessTools(ctx: ArrayToolContext) {
  /** Shared by the two access tools — they differ only in how they're phrased. */
  const runAccess = (index: number) => {
    ctx.patch({ selectedIndex: index });
    return commit(ctx, accessArrayElement(ctx.state.array.values, index, ctx.state.array.name));
  };

  return {
    // `access_by_index` used to exist alongside this as a second name for the
    // identical operation. Two tools that do the same thing only ever split
    // the model's choice, so there is one.
    access_array_element: tool({
      description:
        "Read the value at one index and spotlight that cell. Use for 'what is at index 2', 'show me the third element', 'access A of 1', 'index into the array'. This is the O(1) random-access demonstration.",
      inputSchema: z.object({
        index: z.number().int().describe("Zero-based index to read."),
      }),
      execute: async ({ index }) => runAccess(index),
    }),

    update_array_element: tool({
      description:
        "Overwrite the value at one index, in place. Use for 'change index 2 to 99', 'set the first element to 7'. Nothing shifts — that is what makes update different from insert.",
      inputSchema: z.object({
        index: z.number().int().describe("Zero-based index to overwrite."),
        value: z.union([z.string(), z.number()]).describe("The new value."),
      }),
      execute: async ({ index, value }) => {
        const { values, name } = ctx.state.array;
        if (index < 0 || index >= values.length) {
          return fail(
            ctx,
            `Index ${index} is out of bounds — valid indices are 0 to ${values.length - 1}.`,
          );
        }

        const previous = values[index];
        const next = [...values];
        next[index] = String(value);

        ctx.play({
          values: next,
          frames: [
            {
              values,
              active: [],
              visited: [],
              settled: [],
              caret: { index },
              note: `${name}[${index}] currently holds ${previous}.`,
            },
            {
              values: next,
              active: [index],
              visited: [],
              settled: [],
              caret: { index },
              note: `Write ${value} straight into the slot — no elements move.`,
            },
          ],
          summary: `${name}[${index}] changed from ${previous} to ${value}.`,
          complexity: {
            time: "O(1)",
            space: "O(1)",
            reason: "The slot's address is known, so writing is a single memory store.",
          },
        });
        return report(ctx, `${name}[${index}] is now ${value} (was ${previous}).`);
      },
    }),
  };
}
