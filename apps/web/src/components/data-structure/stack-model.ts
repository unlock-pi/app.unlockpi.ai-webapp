/**
 * Pure stack domain rules — no React, no framework, no side effects.
 *
 * Why this exists as its own module instead of living inline in whichever
 * component happens to render a stack: capacity/full/empty is a DOMAIN rule,
 * not a UI concern. It needs to produce the exact same answer whether a
 * push/pop was triggered by a click in a playground page, a teacher's voice
 * command routed through the OpenAI Realtime tool-call loop, or a future
 * keyboard shortcut. Writing it once here and importing it everywhere means
 * "is the stack full" can never drift between two call sites — which is
 * exactly the kind of bug that's invisible until a demo, because the click
 * path and the voice path silently disagree.
 *
 * @example
 * ```ts
 * const capacity: StackCapacity = { isFixed: true, size: 5 };
 * pushStack(["a", "b"], "c", capacity); // -> ["a", "b", "c"]
 * pushStack(["a", "b", "c", "d", "e"], "f", capacity); // -> unchanged, already full
 * ```
 */

export type StackCapacity =
  | { isFixed: false }
  | { isFixed: true; size: number };

/** True once `length` has reached a fixed stack's capacity. Dynamic stacks are never full. */
export function isStackFull(length: number, capacity: StackCapacity): boolean {
  return capacity.isFixed && length >= capacity.size;
}

export function isStackEmpty(length: number): boolean {
  return length <= 0;
}

export function canPushStack(length: number, capacity: StackCapacity): boolean {
  return !isStackFull(length, capacity);
}

export function canPopStack(length: number): boolean {
  return !isStackEmpty(length);
}

/**
 * Push `value` onto the top. No-ops (returns `values` unchanged) if the
 * stack is already at capacity — callers should check `canPushStack` first
 * if they need to distinguish "did nothing" from "pushed" (e.g. to surface a
 * "stack is full" message to the teacher or the AI).
 */
export function pushStack<T>(values: readonly T[], value: T, capacity: StackCapacity): T[] {
  if (!canPushStack(values.length, capacity)) {
    return [...values];
  }
  return [...values, value];
}

/** Remove the top value. No-ops on an already-empty stack. */
export function popStack<T>(values: readonly T[]): T[] {
  if (!canPopStack(values.length)) {
    return [...values];
  }
  return values.slice(0, -1);
}

/**
 * Trim `values` down to `capacity.size` when fixed. Used when a stack
 * transitions from dynamic to fixed, or when its size is shrunk below its
 * current length — both cases where the data must be reconciled to the new
 * invariant rather than left to violate it silently.
 */
export function clampStackToCapacity<T>(values: readonly T[], capacity: StackCapacity): T[] {
  if (capacity.isFixed && values.length > capacity.size) {
    return values.slice(0, capacity.size);
  }
  return [...values];
}
