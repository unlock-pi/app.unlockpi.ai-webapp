import { tool } from "ai";
import { z } from "zod";

import {
  commit,
  fail,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";
import { MAX_STACK_HEIGHT } from "@/features/stacks-agent/lib/stack-frames";
import {
  createEmptyStack,
  createStack,
  duplicateTop,
  peek,
  pop,
  popMultiple,
  push,
  pushMultiple,
  swapTopTwo,
  type StackLimits,
} from "@/features/stacks-agent/lib/stack-ops";

/**
 * Making a stack, and the only two things you may do to one.
 *
 * Deliberately NOT insert_at_index, delete_from_beginning or any of the
 * array tools: a stack that lets you reach the middle is just an array with
 * a misleading name, and the whole lesson is what closing the other end buys
 * you. If the teacher asks for one of those, the refusal is the teaching
 * moment — say it plainly and offer push or pop.
 */
export function createStackCoreTools(ctx: ArrayToolContext) {
  const stack = () => ctx.state.array;
  const limits = (): StackLimits => ({ capacity: ctx.state.capacity?.size ?? null });

  return {
    create_stack: tool({
      description:
        "Create a stack on the board from values, pushed bottom to top in the order given. Use for 'create a stack with 8, 5, 0', 'make a stack of these', 'start a stack'. The LAST value ends up on top. Replaces whatever stack is showing.",
      inputSchema: z.object({
        values: z
          .array(z.union([z.string(), z.number()]))
          .describe("Values in push order — the first is the bottom, the last is the top."),
        name: z
          .string()
          .optional()
          .describe("Variable name shown beside the stack. Defaults to S."),
        capacity: z
          .number()
          .int()
          .min(1)
          .max(MAX_STACK_HEIGHT)
          .optional()
          .describe(
            `Fixed capacity, if the teacher wants one that can overflow. Leave it out for a stack that grows. Maximum ${MAX_STACK_HEIGHT}.`,
          ),
      }),
      execute: async ({ values, name, capacity }) => {
        if (values.length === 0) {
          return fail(ctx, "Give at least one value, or use create_empty_stack instead.");
        }
        const stackName = name?.trim() || stack().name;
        ctx.patch({ name: stackName, capacity: capacity ? { size: capacity } : null });
        const result = createStack(values, stackName, { capacity: capacity ?? null });
        ctx.ensureArray(result.values, stackName);
        return commit(ctx, result);
      },
    }),

    create_empty_stack: tool({
      description:
        "Create an empty stack, optionally with a fixed capacity. Use for 'make an empty stack', 'create a stack of size 5', 'give me a stack that holds 4'. A fixed capacity is what makes overflow possible — ask for one when teaching overflow.",
      inputSchema: z.object({
        name: z.string().optional().describe("Variable name. Defaults to S."),
        capacity: z
          .number()
          .int()
          .min(1)
          .max(MAX_STACK_HEIGHT)
          .optional()
          .describe(`Fixed number of slots. Leave out for a stack that grows. Maximum ${MAX_STACK_HEIGHT}.`),
      }),
      execute: async ({ name, capacity }) => {
        const stackName = name?.trim() || stack().name;
        ctx.patch({ name: stackName, capacity: capacity ? { size: capacity } : null });
        const result = createEmptyStack(stackName, capacity ?? null);
        ctx.ensureArray(result.values, stackName);
        return commit(ctx, result);
      },
    }),

    set_stack_capacity: tool({
      description:
        "Fix the stack's capacity, or let it grow again. Use for 'make it a stack of size 4', 'this stack can only hold 3', 'let it grow'. A fixed stack refuses a push when full, which is stack overflow.",
      inputSchema: z.object({
        capacity: z
          .number()
          .int()
          .min(1)
          .max(MAX_STACK_HEIGHT)
          .nullable()
          .describe(`Slots the stack holds, or null to let it grow. Maximum ${MAX_STACK_HEIGHT}.`),
      }),
      execute: async ({ capacity }) => {
        const { values, name } = stack();
        if (capacity !== null && values.length > capacity) {
          return fail(
            ctx,
            `${name} already holds ${values.length} item(s), so it cannot be capped at ${capacity}. Pop some first.`,
          );
        }
        ctx.patch({ capacity: capacity === null ? null : { size: capacity } });
        return commit(ctx, {
          values,
          frames: [
            {
              values,
              active: values.length ? [values.length - 1] : [],
              visited: [],
              settled: [],
              note:
                capacity === null
                  ? `${name} grows as you push.`
                  : `${name} now holds at most ${capacity}.`,
            },
          ],
          summary:
            capacity === null
              ? `${name} can grow now — it will never report itself full.`
              : `${name} is fixed at ${capacity} slot(s); ${values.length} used, ${capacity - values.length} free. A push past that is stack overflow.`,
        });
      },
    }),

    push: tool({
      description:
        "Push one value onto the top of the stack. Use for 'push 5', 'add 7', 'put 3 on the stack'. This is the ONLY way something goes into a stack. Refuses when a fixed stack is full — that refusal is stack overflow, so explain it rather than working around it.",
      inputSchema: z.object({
        value: z.union([z.string(), z.number()]).describe("The value to push."),
      }),
      execute: async ({ value }) => {
        const { values, name } = stack();
        return commit(ctx, push(values, String(value).trim(), name, limits()));
      },
    }),

    pop: tool({
      description:
        "Remove the top value and report it. Use for 'pop', 'remove the top', 'take one off'. This is the ONLY way something leaves a stack. Refuses on an empty stack — that refusal is stack underflow.",
      inputSchema: z.object({}),
      execute: async () => {
        const { values, name } = stack();
        return commit(ctx, pop(values, name));
      },
    }),

    peek: tool({
      description:
        "Read the top value WITHOUT removing it. Use for 'peek', 'what is on top', 'show me the top without popping', 'top()'. The difference between this and pop is the thing students most often get wrong, so it is worth saying out loud.",
      inputSchema: z.object({}),
      execute: async () => {
        const { values, name } = stack();
        return commit(ctx, peek(values, name));
      },
    }),

    push_multiple: tool({
      description:
        "Push several values, one after another, in the order given. Use for 'push 1, 2 and 3', 'add these three'. The last one ends up on top.",
      inputSchema: z.object({
        values: z
          .array(z.union([z.string(), z.number()]))
          .min(1)
          .describe("Values in push order; the last becomes the top."),
      }),
      execute: async ({ values }) => {
        const current = stack();
        return commit(ctx, pushMultiple(current.values, values, current.name, limits()));
      },
    }),

    pop_multiple: tool({
      description:
        "Pop several values off the top, one at a time. Use for 'pop three', 'remove the top two'. Refuses rather than emptying past the bottom.",
      inputSchema: z.object({
        count: z.number().int().min(1).describe("How many to pop, from the top down."),
      }),
      execute: async ({ count }) => {
        const { values, name } = stack();
        return commit(ctx, popMultiple(values, count, name));
      },
    }),

    duplicate_top: tool({
      description:
        "Copy the top value and push the copy, so it sits on the stack twice. Use for 'duplicate the top', 'dup', 'push a copy of the top'. This is the DUP of a stack machine — worth showing when teaching how expressions are evaluated.",
      inputSchema: z.object({}),
      execute: async () => {
        const { values, name } = stack();
        return commit(ctx, duplicateTop(values, name, limits()));
      },
    }),

    swap_top_two: tool({
      description:
        "Exchange the top two values, using two pops and two pushes. Use for 'swap the top two', 'switch the top two around'. Shows that a stack cannot reorder in place.",
      inputSchema: z.object({}),
      execute: async () => {
        const { values, name } = stack();
        return commit(ctx, swapTopTwo(values, name));
      },
    }),
  };
}
