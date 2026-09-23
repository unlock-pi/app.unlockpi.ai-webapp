import { tool } from "ai";
import { z } from "zod";

import {
  commit,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";
import {
  clearStack,
  isEmpty,
  isFull,
  reverseStack,
  searchStack,
  size,
  traverseStack,
} from "@/features/stacks-agent/lib/stack-ops";

/**
 * The questions you are allowed to ask a stack, and the price of the answers.
 *
 * is_empty, is_full and size are free. Searching and reading it out are not:
 * both have to unstack everything above what they want and put it back, and
 * the animation shows that work rather than skipping to the answer.
 */
export function createStackInspectionTools(ctx: ArrayToolContext) {
  const stack = () => ctx.state.array;

  return {
    is_stack_empty: tool({
      description:
        "Check whether the stack is empty. Use for 'is it empty', 'isEmpty', 'can I pop'. This is the check that belongs before every pop.",
      inputSchema: z.object({}),
      execute: async () => {
        const { values, name } = stack();
        return commit(ctx, isEmpty(values, name));
      },
    }),

    is_stack_full: tool({
      description:
        "Check whether a fixed-size stack has room left. Use for 'is it full', 'isFull', 'can I push'. A stack with no fixed capacity is never full — say so rather than inventing a limit.",
      inputSchema: z.object({}),
      execute: async () => {
        const { values, name } = stack();
        return commit(ctx, isFull(values, name, { capacity: ctx.state.capacity?.size ?? null }));
      },
    }),

    stack_size: tool({
      description:
        "Report how many items the stack holds. Use for 'how many', 'size', 'length', 'how tall is it'.",
      inputSchema: z.object({}),
      execute: async () => {
        const { values, name } = stack();
        return commit(ctx, size(values, name));
      },
    }),

    search_stack: tool({
      description:
        "Find a value in the stack by popping down to it and putting everything back. Use for 'is 5 in there', 'find 8', 'how far down is 3'. Shows why a stack has no random access: reaching the fourth item means moving the three above it.",
      inputSchema: z.object({
        target: z.union([z.string(), z.number()]).describe("The value to look for."),
      }),
      execute: async ({ target }) => {
        const { values, name } = stack();
        return commit(ctx, searchStack(values, String(target).trim(), name));
      },
    }),

    traverse_stack: tool({
      description:
        "Read every item out, top to bottom, then put the stack back as it was. Use for 'read it out', 'show me everything in it', 'traverse the stack', 'print the stack'.",
      inputSchema: z.object({}),
      execute: async () => {
        const { values, name } = stack();
        return commit(ctx, traverseStack(values, name));
      },
    }),

    clear_stack: tool({
      description:
        "Empty the stack by popping everything, one at a time. Use for 'empty it', 'clear the stack', 'start over'. Shows that clearing is n pops rather than one instruction.",
      inputSchema: z.object({}),
      execute: async () => {
        const { values, name } = stack();
        return commit(ctx, clearStack(values, name));
      },
    }),

    reverse_stack: tool({
      description:
        "Turn the stack upside down using a helper stack. Use for 'reverse it', 'flip the stack', 'turn it over'. The bottom becomes the top.",
      inputSchema: z.object({}),
      execute: async () => {
        const { values, name } = stack();
        return commit(ctx, reverseStack(values, name));
      },
    }),
  };
}
