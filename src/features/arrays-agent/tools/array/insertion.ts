import { tool } from "ai";
import { z } from "zod";

import {
  insertAtBeginning,
  insertAtEnd,
  insertAtIndex,
  insertMultiple,
  sortedInsert,
} from "@/features/arrays-agent/lib/array-ops";
import {
  commit,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";

const valueSchema = z.union([z.string(), z.number()]);

export function createInsertionTools(ctx: ArrayToolContext) {
  const array = () => ctx.state.array;
  /** Slow mode shows every individual copy; otherwise the tail moves as one block. */
  const shift = () => ({ stepwise: ctx.state.teaching.speed === "slow" });

  return {
    insert_at_beginning: tool({
      description:
        "Insert a value at index 0, shifting every existing element one slot right. Use for 'add 5 to the beginning', 'put it at the front', 'unshift'. This is the O(n) insert that shows why the front is expensive.",
      inputSchema: z.object({ value: valueSchema.describe("The value to insert.") }),
      execute: async ({ value }) => {
        ctx.patch({ topic: "array_insertion" });
        return commit(ctx, insertAtBeginning(array().values, String(value), array().name, shift()));
      },
    }),

    insert_at_end: tool({
      description:
        "Append a value to the end of the array. Use for 'add 60 to the end', 'append', 'push'. Nothing shifts, so this is the O(1) counterpart to insert_at_beginning.",
      inputSchema: z.object({ value: valueSchema.describe("The value to append.") }),
      execute: async ({ value }) => {
        ctx.patch({ topic: "array_insertion" });
        return commit(ctx, insertAtEnd(array().values, String(value), array().name, shift()));
      },
    }),

    insert_at_index: tool({
      description:
        "Insert a value at a specific index, shifting that element and everything after it one slot right. Use for 'put 12 at index 2', 'insert 25 in the middle', 'add it as the third element'.",
      inputSchema: z.object({
        index: z
          .number()
          .int()
          .min(0)
          .describe("Zero-based position the new value should end up at."),
        value: valueSchema.describe("The value to insert."),
      }),
      execute: async ({ index, value }) => {
        ctx.patch({ topic: "array_insertion" });
        return commit(ctx, insertAtIndex(array().values, index, String(value), array().name, shift()));
      },
    }),

    insert_multiple: tool({
      description:
        "Insert several values in a row starting at one index, shifting once per value. Use for 'insert 30 and 40 at index 2', 'add these three numbers in the middle'.",
      inputSchema: z.object({
        index: z.number().int().min(0).describe("Where the first new value goes."),
        values: z.array(valueSchema).min(1).describe("Values in the order they should appear."),
      }),
      execute: async ({ index, values }) => {
        ctx.patch({ topic: "array_insertion" });
        return commit(ctx, insertMultiple(array().values, index, values, array().name, shift()));
      },
    }),

    sorted_insert: tool({
      description:
        "Insert a value into its correct position so the array stays sorted ascending. Use for 'insert 35 keeping it sorted', 'add 7 in the right place', 'maintain sorted order'. Requires a numeric, already-sorted array.",
      inputSchema: z.object({ value: valueSchema.describe("The value to place in order.") }),
      execute: async ({ value }) => {
        ctx.patch({ topic: "sorted_insertion" });
        return commit(ctx, sortedInsert(array().values, String(value), array().name, shift()));
      },
    }),
  };
}
