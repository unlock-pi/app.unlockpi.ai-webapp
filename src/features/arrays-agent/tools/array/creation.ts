import { tool } from "ai";
import { z } from "zod";

import { MAX_ARRAY_LENGTH, toDisplayValues } from "@/features/arrays-agent/lib/array-frames";
import { createArray, createEmptyArray } from "@/features/arrays-agent/lib/array-ops";
import {
  commit,
  fail,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";

export function createCreationTools(ctx: ArrayToolContext) {
  return {
    create_array: tool({
      description:
        "Create a new array on the board from explicit values. Use for 'create an array with 10, 20, 30', 'make an array of 5, 3, 8', 'start with these numbers'. Replaces whatever array is currently shown.",
      inputSchema: z.object({
        values: z
          .array(z.union([z.string(), z.number()]))
          .describe("The values in order, e.g. [10, 20, 30, 40]."),
        name: z
          .string()
          .optional()
          .describe("Variable name shown beside the array. Defaults to A."),
      }),
      execute: async ({ values, name }) => {
        if (values.length === 0) {
          return fail(ctx, "Give at least one value, or use create_empty_array instead.");
        }
        const arrayName = name?.trim() || ctx.state.array.name;
        ctx.ensureArray(toDisplayValues(values).slice(0, MAX_ARRAY_LENGTH), arrayName);
        ctx.patch({ name: arrayName, dimensions: [Math.min(values.length, MAX_ARRAY_LENGTH)] });
        return commit(ctx, createArray(values, arrayName));
      },
    }),

    create_empty_array: tool({
      description:
        "Create an array of a given size with no values in it yet. Use for 'make an empty array of size 5', 'declare an array with 6 slots'. Teaches that allocation and filling are separate steps.",
      inputSchema: z.object({
        length: z
          .number()
          .int()
          .min(0)
          .max(MAX_ARRAY_LENGTH)
          .describe(`How many empty slots to reserve (0 to ${MAX_ARRAY_LENGTH}).`),
        name: z.string().optional().describe("Variable name. Defaults to A."),
      }),
      execute: async ({ length, name }) => {
        const arrayName = name?.trim() || ctx.state.array.name;
        const result = createEmptyArray(length, arrayName);
        ctx.ensureArray(result.values, arrayName);
        ctx.patch({ name: arrayName, dimensions: [result.values.length] });
        return commit(ctx, result);
      },
    }),

    create_multidimensional_array: tool({
      description:
        "Create a 2-D array (a grid) of the given rows and columns. Use for 'make a 2 by 3 array', 'create a 3x3 grid'. The board shows the flat row-major layout, which is how a 2-D array really sits in memory.",
      inputSchema: z.object({
        rows: z.number().int().min(1).max(6).describe("Number of rows."),
        cols: z.number().int().min(1).max(6).describe("Number of columns."),
        values: z
          .array(z.union([z.string(), z.number()]))
          .optional()
          .describe("Optional contents in row-major order. Defaults to empty slots."),
        name: z.string().optional().describe("Variable name. Defaults to A."),
      }),
      execute: async ({ rows, cols, values, name }) => {
        const size = rows * cols;
        if (size > MAX_ARRAY_LENGTH) {
          return fail(
            ctx,
            `A ${rows}x${cols} grid needs ${size} cells, more than the ${MAX_ARRAY_LENGTH} this frame fits. Try a smaller grid.`,
          );
        }

        const arrayName = name?.trim() || ctx.state.array.name;
        const contents = values?.length
          ? toDisplayValues(values).slice(0, size)
          : Array.from({ length: size }, () => "");
        const padded = [
          ...contents,
          ...Array.from({ length: size - contents.length }, () => ""),
        ];

        ctx.ensureArray(padded, arrayName);
        ctx.patch({ name: arrayName, dimensions: [rows, cols] });

        const result = createArray(padded, arrayName);
        return commit(ctx, {
          ...result,
          summary: `Created ${arrayName} as a ${rows}x${cols} grid — ${size} cells laid out in row-major order, so ${arrayName}[r][c] is flat index r * ${cols} + c.`,
          meta: { rows, cols },
        });
      },
    }),
  };
}
