import { tool } from "ai";
import { z } from "zod";

import {
  deleteAtIndex,
  deleteByValue,
  deleteFromBeginning,
  deleteFromEnd,
  deleteMultiple,
} from "@/features/arrays-agent/lib/array-ops";
import {
  commit,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";

export function createDeletionTools(ctx: ArrayToolContext) {
  const array = () => ctx.state.array;

  return {
    delete_from_beginning: tool({
      description:
        "Remove the element at index 0, shifting everything after it one slot left. Use for 'remove the first element', 'delete from the front', 'shift'.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.patch({ topic: "array_deletion" });
        return commit(ctx, deleteFromBeginning(array().values, array().name));
      },
    }),

    delete_from_end: tool({
      description:
        "Remove the last element. Nothing shifts, so this is the cheap deletion. Use for 'remove the last one', 'delete from the end', 'pop'.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.patch({ topic: "array_deletion" });
        return commit(ctx, deleteFromEnd(array().values, array().name));
      },
    }),

    delete_at_index: tool({
      description:
        "Remove the element at a specific index, shifting the tail left to close the gap. Use for 'delete index 2', 'remove the third element'.",
      inputSchema: z.object({
        index: z.number().int().describe("Zero-based index to remove."),
      }),
      execute: async ({ index }) => {
        ctx.patch({ topic: "array_deletion" });
        return commit(ctx, deleteAtIndex(array().values, index, array().name));
      },
    }),

    delete_multiple: tool({
      description:
        "Remove several elements by index in one operation. Use for 'delete indices 1 and 3', 'remove the second and fourth elements'. Deletes highest index first so the other indices stay valid.",
      inputSchema: z.object({
        indices: z.array(z.number().int()).min(1).describe("Zero-based indices to remove."),
      }),
      execute: async ({ indices }) => {
        ctx.patch({ topic: "array_deletion" });
        return commit(ctx, deleteMultiple(array().values, indices, array().name));
      },
    }),

    delete_by_value: tool({
      description:
        "Find a value and remove it. Use for 'remove 30', 'delete the 20', 'remove all occurrences of 20'. Set all to true only when the teacher asks for every occurrence.",
      inputSchema: z.object({
        value: z.union([z.string(), z.number()]).describe("The value to remove."),
        all: z
          .boolean()
          .optional()
          .describe("True to remove every occurrence; false or omitted removes only the first."),
      }),
      execute: async ({ value, all }) => {
        ctx.patch({ topic: "array_deletion" });
        return commit(
          ctx,
          deleteByValue(array().values, String(value), Boolean(all), array().name),
        );
      },
    }),
  };
}
