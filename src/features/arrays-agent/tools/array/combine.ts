import { tool } from "ai";
import { z } from "zod";

import {
  addArrays,
  concatArrays,
  mergeSortedArrays,
} from "@/features/arrays-agent/lib/array-combine";
import { MAX_ARRAY_LENGTH, toDisplayValues } from "@/features/arrays-agent/lib/array-frames";
import {
  commit,
  fail,
  report,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";

/**
 * Operations across TWO arrays.
 *
 * The sources stay on the board untouched and the answer is built in its own
 * block, because that is the thing being taught: joining or adding arrays
 * does not modify either original, it fills a new block.
 */
export function createCombineTools(ctx: ArrayToolContext) {
  const NO_CANVAS =
    "Working with two arrays needs a canvas frame to lay them out on.";

  /** Resolve the two arrays the teacher means, by name or by position. */
  const pickSources = (first?: string, second?: string) => {
    const arrays = ctx.combine?.list() ?? [];
    if (arrays.length < 2) return { error: arrays.length, arrays, a: null, b: null };

    const byName = (name?: string) =>
      name
        ? arrays.find((entry) => entry.name.toLowerCase() === name.toLowerCase())
        : undefined;

    const a = byName(first) ?? arrays[0];
    const b = byName(second) ?? arrays.find((entry) => entry.name !== a.name) ?? arrays[1];
    return { error: 0, arrays, a, b };
  };

  return {
    create_second_array: tool({
      description:
        "Put ANOTHER array on the frame alongside the one already there, so two can be compared, joined or added. Use for 'add a second array', 'now make another array with 4, 5, 6', 'create array B'. The first array stays exactly as it is.",
      inputSchema: z.object({
        values: z
          .array(z.union([z.string(), z.number()]))
          .min(1)
          .describe("Values for the new array, in order."),
        name: z
          .string()
          .optional()
          .describe("Single letter to label it, e.g. B. Defaults to the next free letter."),
      }),
      execute: async ({ values, name }) => {
        if (!ctx.combine) return fail(ctx, NO_CANVAS);
        const trimmed = toDisplayValues(values).slice(0, MAX_ARRAY_LENGTH);
        const created = ctx.combine.addArray(trimmed, name);
        if (!created) {
          return fail(
            ctx,
            "This frame has no room for another array. Clear it, or start a new frame first — the two arrays need to be visible together.",
          );
        }
        return report(
          ctx,
          `Added ${created} = [${trimmed.join(", ")}] beside the first array. Both are on the frame now.`,
        );
      },
    }),

    combine_arrays: tool({
      description:
        "Join or add two arrays into a new one, animating the result being built. 'concatenate' joins them end to end ('concatenate A and B', 'join them', 'A plus B'); 'add' adds them index by index ('add the arrays', 'element-wise sum'); 'merge_sorted' merges two sorted arrays keeping the order. The originals are never changed.",
      inputSchema: z.object({
        operation: z
          .enum(["concatenate", "add", "merge_sorted"])
          .describe(
            "concatenate = end to end; add = pairwise sums, needs equal lengths; merge_sorted = interleave two sorted arrays.",
          ),
        first: z.string().optional().describe("Name of the first array, e.g. A. Defaults to the leftmost."),
        second: z.string().optional().describe("Name of the second array, e.g. B."),
      }),
      execute: async ({ operation, first, second }) => {
        if (!ctx.combine) return fail(ctx, NO_CANVAS);

        const { arrays, a, b } = pickSources(first, second);
        if (!a || !b) {
          return fail(
            ctx,
            arrays.length === 0
              ? "There are no arrays on this frame yet. Create one, then add a second with create_second_array."
              : "There is only one array on this frame. Use create_second_array to put another one beside it first.",
          );
        }

        // Work out the answer BEFORE making a block for it, so a refusal
        // (mismatched lengths, too long) leaves the frame untouched.
        const names = { a: a.name, b: b.name, result: "" };
        const preview =
          operation === "concatenate"
            ? concatArrays(a.values, b.values, { ...names, result: "the result" })
            : operation === "add"
              ? addArrays(a.values, b.values, { ...names, result: "the result" })
              : mergeSortedArrays(a.values, b.values, { ...names, result: "the result" });

        if (preview.rejected) return fail(ctx, preview.summary);

        const resultName = ctx.combine.useResult();
        if (!resultName) {
          return fail(
            ctx,
            "This frame has no room for the result. Clear something off it first, then try again.",
          );
        }

        const final =
          operation === "concatenate"
            ? concatArrays(a.values, b.values, { ...names, result: resultName })
            : operation === "add"
              ? addArrays(a.values, b.values, { ...names, result: resultName })
              : mergeSortedArrays(a.values, b.values, { ...names, result: resultName });

        ctx.patch({ topic: `array_${operation}`, name: resultName });
        return commit(ctx, final);
      },
    }),
  };
}
