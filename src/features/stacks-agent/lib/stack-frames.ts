import { frame } from "@/features/arrays-agent/lib/array-frames";
import type {
  ArrayFrame,
  ArrayValue,
  Complexity,
} from "@/features/arrays-agent/lib/array-types";

/**
 * Frames for a stack.
 *
 * Deliberately the SAME `ArrayFrame` the arrays engine produces: a stack is
 * an array whose cells you may only touch at one end, so the beats, the
 * player and the renderer are all shared. Index 0 is the bottom of the
 * bucket; the last index is the top — the only cell a stack lets anyone
 * reach.
 */

/**
 * A stack is drawn as a vertical bucket, so height, not width, is what runs
 * out. Eight cells is what still reads from the back of a room inside the
 * fixed 16:9 frame.
 */
export const MAX_STACK_HEIGHT = 8;

/** The only index a stack exposes. -1 when it is empty. */
export function topIndex(values: ArrayValue[]): number {
  return values.length - 1;
}

export function stackFrame(
  values: ArrayValue[],
  note: string,
  overrides: Partial<Omit<ArrayFrame, "values" | "note">> = {},
): ArrayFrame {
  return frame(values, note, overrides);
}

/** The top cell lit, which is the resting picture of a stack between beats. */
export function topFrame(values: ArrayValue[], note: string): ArrayFrame {
  const top = topIndex(values);
  return stackFrame(values, note, top < 0 ? {} : { active: [top] });
}

/**
 * The two errors a stack has, and the words for them.
 *
 * Overflow and underflow are not edge cases to be swallowed — they are the
 * lesson. Both return a sentence the tutor can say as-is.
 */
export function overflowError(
  name: string,
  length: number,
  capacity: number,
): string {
  return `${name} is full — ${length} of ${capacity} slots used. That is stack overflow: a push has nowhere to go, so it is refused. Pop something first.`;
}

export function underflowError(name: string): string {
  return `${name} is empty, so there is nothing to take off the top. That is stack underflow — the pop is refused rather than returning a made-up value.`;
}

export const STACK_COMPLEXITY: Record<string, Complexity> = {
  push: {
    time: "O(1)",
    space: "O(1)",
    reason: "The value lands on the next free slot at the top; nothing below it moves.",
  },
  pop: {
    time: "O(1)",
    space: "O(1)",
    reason: "Only the top slot is released; every cell below it stays exactly where it is.",
  },
  peek: {
    time: "O(1)",
    space: "O(1)",
    reason: "The top index is known, so the value is read straight from it.",
  },
  is_empty: {
    time: "O(1)",
    space: "O(1)",
    reason: "It is one comparison against the stored size.",
  },
  size: {
    time: "O(1)",
    space: "O(1)",
    reason: "The count is kept as the stack changes rather than recounted.",
  },
  search_stack: {
    time: "O(n)",
    space: "O(1)",
    reason:
      "A stack has no index to jump to, so reaching an item means popping everything above it — in the worst case the whole stack.",
  },
  traverse_stack: {
    time: "O(n)",
    space: "O(n)",
    reason:
      "Reading every item means popping them all off and pushing them back to restore the stack.",
  },
  clear_stack: {
    time: "O(n)",
    space: "O(1)",
    reason: "Every item is popped once.",
  },
  reverse_stack: {
    time: "O(n)",
    space: "O(n)",
    reason: "Every item moves through a second stack, which holds up to n of them.",
  },
  balanced_parentheses: {
    time: "O(n)",
    space: "O(n)",
    reason:
      "Each character is looked at once; the stack holds at most one entry per unclosed opener.",
  },
  infix_to_postfix: {
    time: "O(n)",
    space: "O(n)",
    reason: "Each token is pushed and popped at most once.",
  },
  evaluate_postfix: {
    time: "O(n)",
    space: "O(n)",
    reason: "Each token is read once; the stack holds the operands waiting for an operator.",
  },
};
