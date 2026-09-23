import { tool } from "ai";
import { z } from "zod";

import {
  commit,
  fail,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";
import {
  balancedParentheses,
  callStack,
  decimalToBinary,
  evaluatePostfix,
  infixToPostfix,
  nextGreaterElement,
  reverseSequence,
  undoHistory,
} from "@/features/stacks-agent/lib/stack-applications";

/**
 * The lessons that answer "why do we need this".
 *
 * One tool with an enum rather than eight tools, for the same reason the
 * block editor has one `add_block`: eight near-identical entries measurably
 * hurt a realtime model's choice, and the enum doubles as the syllabus.
 */
export function createStackApplicationTools(ctx: ArrayToolContext) {
  const name = () => ctx.state.array.name;

  return {
    run_stack_application: tool({
      description:
        "Work through a classic use of a stack on the board, step by step. Use for 'check if these brackets are balanced', 'convert this to postfix', 'evaluate this postfix expression', 'reverse this word', 'convert 13 to binary', 'next greater element', 'show me how undo works', 'show me the call stack for factorial', 'why do we even need stacks'. This REPLACES what is on the stack with the working, so say what you are about to show first.",
      inputSchema: z.object({
        application: z
          .enum([
            "balanced_parentheses",
            "reverse_sequence",
            "infix_to_postfix",
            "evaluate_postfix",
            "decimal_to_binary",
            "next_greater_element",
            "undo_history",
            "call_stack",
          ])
          .describe(
            "balanced_parentheses: do the brackets in an expression match. reverse_sequence: a stack reverses whatever passes through it. infix_to_postfix: shunting-yard conversion. evaluate_postfix: compute a postfix expression. decimal_to_binary: remainders pushed then popped. next_greater_element: the O(n) monotonic-stack trick. undo_history: why undo is a stack. call_stack: why recursion needs one.",
          ),
        expression: z
          .string()
          .optional()
          .describe(
            "For balanced_parentheses ('(a + [b])'), infix_to_postfix ('a + b * c') and evaluate_postfix ('5 3 + 2 *').",
          ),
        items: z
          .array(z.union([z.string(), z.number()]))
          .optional()
          .describe(
            "For reverse_sequence (the letters or values), next_greater_element (the numbers) and undo_history (the actions, oldest first).",
          ),
        number: z
          .number()
          .optional()
          .describe(
            "For decimal_to_binary (the number to convert), call_stack (the n in factorial(n)) and undo_history (how many steps to undo).",
          ),
      }),
      execute: async ({ application, expression, items, number }) => {
        const stackName = name();
        const needsExpression = () =>
          fail(ctx, `Say the expression to run ${application.replace(/_/g, " ")} on.`);
        const needsItems = () =>
          fail(ctx, `Say the values to run ${application.replace(/_/g, " ")} on.`);

        switch (application) {
          case "balanced_parentheses":
            if (!expression?.trim()) return needsExpression();
            return commit(ctx, balancedParentheses(expression, stackName));

          case "infix_to_postfix":
            if (!expression?.trim()) return needsExpression();
            return commit(ctx, infixToPostfix(expression, stackName));

          case "evaluate_postfix":
            if (!expression?.trim()) return needsExpression();
            return commit(ctx, evaluatePostfix(expression, stackName));

          case "reverse_sequence": {
            // "reverse hello" arrives either as letters or as the word.
            const source =
              items?.length
                ? items.map(String)
                : (expression ?? "").trim().split(/\s*/).filter(Boolean);
            if (source.length === 0) return needsItems();
            return commit(ctx, reverseSequence(source, stackName));
          }

          case "decimal_to_binary":
            if (number === undefined) {
              return fail(ctx, "Say which number to convert to binary.");
            }
            return commit(ctx, decimalToBinary(number, stackName));

          case "next_greater_element": {
            if (!items?.length) return needsItems();
            const numbers = items.map(Number);
            if (numbers.some((value) => !Number.isFinite(value))) {
              return fail(ctx, "Next greater element needs numbers — these are not all numeric.");
            }
            return commit(ctx, nextGreaterElement(numbers, stackName));
          }

          case "undo_history": {
            if (!items?.length) return needsItems();
            return commit(
              ctx,
              undoHistory(items.map(String), number ?? 1, stackName),
            );
          }

          case "call_stack":
            return commit(ctx, callStack(number ?? 4, stackName));
        }
      },
    }),
  };
}
