import { toDisplayValues } from "@/features/arrays-agent/lib/array-frames";
import type {
  ArrayOpResult,
  ArrayValue,
} from "@/features/arrays-agent/lib/array-types";
import {
  MAX_STACK_HEIGHT,
  STACK_COMPLEXITY,
  overflowError,
  stackFrame,
  topFrame,
  topIndex,
  underflowError,
} from "@/features/stacks-agent/lib/stack-frames";

/**
 * Every operation a stack actually has.
 *
 * The rule this whole file enforces: only the top is reachable. Anything that
 * needs a cell further down has to take the cells above it off first, and the
 * frames show exactly that — which is the difference between a stack and the
 * array underneath it.
 */

/** A refusal: the values are unchanged and the summary says why. */
function refuse(values: ArrayValue[], summary: string): ArrayOpResult {
  return {
    values: [...values],
    frames: [topFrame(values, summary)],
    summary,
    rejected: true,
  };
}

export type StackLimits = { capacity: number | null };

/** How many slots are left. A stack with no capacity still has to fit the frame. */
function roomLeft(values: ArrayValue[], limits: StackLimits): number {
  const ceiling = limits.capacity ?? MAX_STACK_HEIGHT;
  return ceiling - values.length;
}

export function createStack(
  values: Array<string | number>,
  name = "S",
  limits: StackLimits = { capacity: null },
): ArrayOpResult {
  const ceiling = limits.capacity ?? MAX_STACK_HEIGHT;
  const contents = toDisplayValues(values).slice(0, ceiling);
  const frames = [stackFrame([], `Empty ${name}. Nothing in it yet.`)];

  // Built one push at a time, because a stack that simply appears skips the
  // only thing that makes it a stack: things went in in this order.
  contents.forEach((value, index) => {
    frames.push(
      stackFrame(contents.slice(0, index + 1), `Push ${value} — it sits on top.`, {
        active: [index],
        found: index,
      }),
    );
  });

  return {
    values: contents,
    frames,
    summary:
      contents.length === 0
        ? `Created ${name} as an empty stack.`
        : `Created ${name} by pushing ${contents.join(", then ")}. ${contents[contents.length - 1]} is on top.`,
    complexity: STACK_COMPLEXITY.push,
    meta: { top: contents[contents.length - 1] ?? null, size: contents.length },
  };
}

export function createEmptyStack(
  name = "S",
  capacity: number | null = null,
): ArrayOpResult {
  return {
    values: [],
    frames: [
      stackFrame(
        [],
        capacity
          ? `Empty ${name}, ${capacity} slots reserved.`
          : `Empty ${name}. It grows as you push.`,
      ),
    ],
    summary: capacity
      ? `Created ${name} as an empty stack with a fixed capacity of ${capacity}.`
      : `Created ${name} as an empty stack.`,
    meta: { size: 0, capacity },
  };
}

// ── The two operations a stack has ─────────────────────────────────────

export function push(
  values: ArrayValue[],
  value: string,
  name = "S",
  limits: StackLimits = { capacity: null },
): ArrayOpResult {
  if (roomLeft(values, limits) <= 0) {
    return refuse(
      values,
      limits.capacity
        ? overflowError(name, values.length, limits.capacity)
        : `${name} is at the ${MAX_STACK_HEIGHT}-cell limit this frame can show. Pop something before pushing more.`,
    );
  }

  const next = [...values, value];
  const landed = next.length - 1;
  return {
    values: next,
    frames: [
      topFrame(
        values,
        values.length === 0
          ? `${name} is empty.`
          : `Top is ${values[values.length - 1]}.`,
      ),
      stackFrame(next, `${value} lands on top, at index ${landed}.`, {
        active: [landed],
        found: landed,
      }),
      topFrame(next, `Pushed. Top is now ${value}. Nothing below it moved.`),
    ],
    summary: `Pushed ${value} onto ${name}. It is the top now, at index ${landed}, and ${name} holds ${next.length} item(s).`,
    complexity: STACK_COMPLEXITY.push,
    meta: { pushed: value, top: value, size: next.length },
  };
}

export function pop(values: ArrayValue[], name = "S"): ArrayOpResult {
  if (values.length === 0) return refuse(values, underflowError(name));

  const removed = values[values.length - 1];
  const next = values.slice(0, -1);
  const nextTop = next[next.length - 1];
  return {
    values: next,
    frames: [
      stackFrame(values, `Top is ${removed} — that is the one that comes off.`, {
        active: [topIndex(values)],
        found: topIndex(values),
      }),
      stackFrame(next, `${removed} is off the stack.`, {
        active: next.length ? [topIndex(next)] : [],
      }),
      topFrame(
        next,
        next.length === 0
          ? `${name} is empty again.`
          : `Top is now ${nextTop} — the one pushed just before ${removed}.`,
      ),
    ],
    summary:
      next.length === 0
        ? `Popped ${removed} from ${name}. ${name} is now empty.`
        : `Popped ${removed} from ${name}. The new top is ${nextTop}, and ${next.length} item(s) remain.`,
    complexity: STACK_COMPLEXITY.pop,
    meta: { popped: removed, top: nextTop ?? null, size: next.length },
  };
}

/** Read the top without removing it — the operation most often confused with pop. */
export function peek(values: ArrayValue[], name = "S"): ArrayOpResult {
  if (values.length === 0) {
    return refuse(values, `${name} is empty, so there is no top to look at.`);
  }
  const top = values[values.length - 1];
  return {
    values: [...values],
    frames: [
      stackFrame(values, `Looking at the top: ${top}.`, {
        active: [topIndex(values)],
        found: topIndex(values),
      }),
      topFrame(values, `${top} is still on the stack — peek only looks.`),
    ],
    summary: `The top of ${name} is ${top}. Peek reads it and leaves it there, so ${name} still holds ${values.length} item(s).`,
    complexity: STACK_COMPLEXITY.peek,
    meta: { top, size: values.length },
  };
}

export function pushMultiple(
  values: ArrayValue[],
  incoming: Array<string | number>,
  name = "S",
  limits: StackLimits = { capacity: null },
): ArrayOpResult {
  const toPush = toDisplayValues(incoming);
  if (toPush.length === 0) return refuse(values, "Say which values to push.");
  if (toPush.length > roomLeft(values, limits)) {
    return refuse(
      values,
      `${name} has room for ${Math.max(roomLeft(values, limits), 0)} more, and you asked to push ${toPush.length}. Pushing them all would overflow it.`,
    );
  }

  const frames = [topFrame(values, `Starting with ${values.length} item(s) on ${name}.`)];
  let current = [...values];
  toPush.forEach((value) => {
    current = [...current, value];
    frames.push(
      stackFrame(current, `Push ${value}.`, {
        active: [current.length - 1],
        found: current.length - 1,
      }),
    );
  });
  frames.push(
    topFrame(current, `Top is ${current[current.length - 1]} — the last one pushed.`),
  );

  return {
    values: current,
    frames,
    summary: `Pushed ${toPush.join(", ")} onto ${name} in that order, so ${toPush[toPush.length - 1]} ended up on top.`,
    complexity: STACK_COMPLEXITY.push,
    meta: { pushed: toPush, size: current.length },
  };
}

export function popMultiple(
  values: ArrayValue[],
  count: number,
  name = "S",
): ArrayOpResult {
  if (!Number.isInteger(count) || count < 1) {
    return refuse(values, "Say how many items to pop — a whole number, at least one.");
  }
  if (count > values.length) {
    return refuse(
      values,
      `${name} holds ${values.length} item(s), so popping ${count} would underflow it.`,
    );
  }

  const frames = [topFrame(values, `${values.length} item(s) on ${name}.`)];
  let current = [...values];
  const removed: string[] = [];
  for (let step = 0; step < count; step += 1) {
    const value = current[current.length - 1];
    removed.push(value);
    current = current.slice(0, -1);
    frames.push(
      stackFrame(current, `Pop ${value}.`, {
        active: current.length ? [current.length - 1] : [],
      }),
    );
  }
  frames.push(
    topFrame(
      current,
      current.length === 0
        ? `${name} is empty.`
        : `Top is now ${current[current.length - 1]}.`,
    ),
  );

  return {
    values: current,
    frames,
    summary: `Popped ${removed.join(", then ")} off ${name} — top first, always. ${current.length} item(s) left.`,
    complexity: STACK_COMPLEXITY.pop,
    meta: { popped: removed, size: current.length },
  };
}

// ── Questions you may ask a stack ──────────────────────────────────────

export function isEmpty(values: ArrayValue[], name = "S"): ArrayOpResult {
  const empty = values.length === 0;
  return {
    values: [...values],
    frames: [
      topFrame(
        values,
        empty ? `${name} is empty.` : `${name} holds ${values.length} item(s).`,
      ),
    ],
    summary: empty
      ? `${name} is empty — a pop right now would underflow, which is why this is the check you make before popping.`
      : `${name} is not empty; it holds ${values.length} item(s) with ${values[values.length - 1]} on top.`,
    complexity: STACK_COMPLEXITY.is_empty,
    meta: { isEmpty: empty, size: values.length },
  };
}

export function isFull(
  values: ArrayValue[],
  name = "S",
  limits: StackLimits = { capacity: null },
): ArrayOpResult {
  if (!limits.capacity) {
    return {
      values: [...values],
      frames: [topFrame(values, `${name} grows as you push.`)],
      summary: `${name} has no fixed capacity, so it is never full — only a fixed-size stack can overflow. It holds ${values.length} item(s).`,
      complexity: STACK_COMPLEXITY.is_empty,
      meta: { isFull: false, size: values.length },
    };
  }

  const full = values.length >= limits.capacity;
  return {
    values: [...values],
    frames: [
      topFrame(
        values,
        full
          ? `${name} is full: ${values.length} of ${limits.capacity}.`
          : `${values.length} of ${limits.capacity} used.`,
      ),
    ],
    summary: full
      ? `${name} is full — ${values.length} of ${limits.capacity}. The next push would overflow.`
      : `${name} is not full: ${values.length} of ${limits.capacity} slots used, ${limits.capacity - values.length} free.`,
    complexity: STACK_COMPLEXITY.is_empty,
    meta: { isFull: full, size: values.length, capacity: limits.capacity },
  };
}

export function size(values: ArrayValue[], name = "S"): ArrayOpResult {
  return {
    values: [...values],
    frames: [topFrame(values, `${name} holds ${values.length} item(s).`)],
    summary: `${name} holds ${values.length} item(s)${values.length ? `, with ${values[values.length - 1]} on top` : ""}.`,
    complexity: STACK_COMPLEXITY.size,
    meta: { size: values.length },
  };
}

/**
 * Find a value — the honest way.
 *
 * A stack cannot jump to an index, so the search pops down to the item and
 * puts everything back afterwards. The frames show that cost, because
 * watching the restore is what answers "why is this worse than an array".
 */
export function searchStack(
  values: ArrayValue[],
  target: string,
  name = "S",
): ArrayOpResult {
  if (values.length === 0) {
    return refuse(values, `${name} is empty, so there is nothing to search.`);
  }

  const frames = [topFrame(values, `Looking for ${target}. Only the top is reachable.`)];
  const lifted: string[] = [];
  let current = [...values];
  let depth = 0;
  let found = false;

  while (current.length > 0) {
    const top = current[current.length - 1];
    frames.push(
      stackFrame(
        current,
        `Top is ${top}${top === target ? " — that is it." : ", not it."}`,
        {
          active: [current.length - 1],
          found: top === target ? current.length - 1 : undefined,
        },
      ),
    );
    if (top === target) {
      found = true;
      break;
    }
    depth += 1;
    lifted.push(top);
    current = current.slice(0, -1);
    frames.push(
      stackFrame(current, `Pop ${top} to reach further down.`, {
        active: current.length ? [current.length - 1] : [],
        held: { value: top, label: "held" },
      }),
    );
  }

  // Put back everything that was lifted off, newest first.
  for (let index = lifted.length - 1; index >= 0; index -= 1) {
    current = [...current, lifted[index]];
    frames.push(
      stackFrame(current, `Push ${lifted[index]} back.`, {
        active: [current.length - 1],
        held: { value: lifted[index], label: "returning" },
      }),
    );
  }
  frames.push(topFrame(current, `${name} is back as it was.`));

  return {
    values: current,
    frames,
    summary: found
      ? `Found ${target} in ${name}, ${depth} item(s) below the top. Reaching it meant popping ${depth} item(s) off and pushing them back — a stack has no index to jump to.`
      : `${target} is not in ${name}. Every item had to be popped and pushed back to be sure, which is why search on a stack costs O(n).`,
    complexity: STACK_COMPLEXITY.search_stack,
    meta: { found, depthFromTop: found ? depth : null, comparisons: depth + 1 },
  };
}

/** Read every item top to bottom, then restore — the only way a stack allows. */
export function traverseStack(values: ArrayValue[], name = "S"): ArrayOpResult {
  if (values.length === 0) {
    return refuse(values, `${name} is empty, so there is nothing to read out.`);
  }

  const frames = [topFrame(values, `Reading ${name} from the top down.`)];
  const order: string[] = [];
  let current = [...values];

  while (current.length > 0) {
    const top = current[current.length - 1];
    order.push(top);
    frames.push(
      stackFrame(current, `Read ${top}.`, {
        active: [current.length - 1],
        found: current.length - 1,
      }),
    );
    current = current.slice(0, -1);
    frames.push(
      stackFrame(current, `Pop ${top} to see what is under it.`, {
        active: current.length ? [current.length - 1] : [],
        held: { value: top, label: "read" },
      }),
    );
  }

  for (let index = order.length - 1; index >= 0; index -= 1) {
    current = [...current, order[index]];
    frames.push(
      stackFrame(current, `Push ${order[index]} back.`, {
        active: [current.length - 1],
      }),
    );
  }
  frames.push(topFrame(current, `${name} is back exactly as it was.`));

  return {
    values: current,
    frames,
    summary: `Top to bottom, ${name} holds ${order.join(", ")}. Reading it meant emptying it and putting it back — that is why traversing a stack costs O(n) extra space and traversing an array costs none.`,
    complexity: STACK_COMPLEXITY.traverse_stack,
    meta: { topToBottom: order },
  };
}

export function clearStack(values: ArrayValue[], name = "S"): ArrayOpResult {
  if (values.length === 0) {
    return refuse(values, `${name} is already empty.`);
  }

  const frames = [topFrame(values, `Emptying ${name}, one pop at a time.`)];
  let current = [...values];
  while (current.length > 0) {
    const top = current[current.length - 1];
    current = current.slice(0, -1);
    frames.push(
      stackFrame(current, `Pop ${top}.`, {
        active: current.length ? [current.length - 1] : [],
      }),
    );
  }
  frames.push(stackFrame([], `${name} is empty.`));

  return {
    values: [],
    frames,
    summary: `Emptied ${name} by popping all ${values.length} item(s), top first. Clearing a stack is n pops, not one instruction.`,
    complexity: STACK_COMPLEXITY.clear_stack,
    meta: { popped: values.length },
  };
}

// ── Stack-machine moves ────────────────────────────────────────────────

export function duplicateTop(
  values: ArrayValue[],
  name = "S",
  limits: StackLimits = { capacity: null },
): ArrayOpResult {
  if (values.length === 0) return refuse(values, underflowError(name));
  if (roomLeft(values, limits) <= 0) {
    return refuse(
      values,
      limits.capacity
        ? overflowError(name, values.length, limits.capacity)
        : `${name} is at the ${MAX_STACK_HEIGHT}-cell limit, so there is no room for a copy.`,
    );
  }

  const top = values[values.length - 1];
  const next = [...values, top];
  return {
    values: next,
    frames: [
      stackFrame(values, `Top is ${top}.`, { active: [topIndex(values)] }),
      stackFrame(values, `Take a copy of ${top} without removing it.`, {
        active: [topIndex(values)],
        held: { value: top, label: "copy" },
      }),
      stackFrame(next, `Push the copy — ${top} is on the stack twice now.`, {
        active: [next.length - 1],
        found: next.length - 1,
      }),
    ],
    summary: `Duplicated the top of ${name}: ${top} now fills the top two slots. This is the DUP a stack machine uses when a value is needed twice.`,
    complexity: STACK_COMPLEXITY.push,
    meta: { duplicated: top, size: next.length },
  };
}

export function swapTopTwo(values: ArrayValue[], name = "S"): ArrayOpResult {
  if (values.length < 2) {
    return refuse(values, `${name} needs at least two items to swap the top two.`);
  }

  const top = values[values.length - 1];
  const under = values[values.length - 2];
  const next = [...values.slice(0, -2), top, under];
  return {
    values: next,
    frames: [
      stackFrame(values, `Top two: ${top} sitting on ${under}.`, {
        active: [values.length - 1, values.length - 2],
      }),
      stackFrame(values.slice(0, -1), `Pop ${top} and hold it.`, {
        active: [values.length - 2],
        held: { value: top, label: "held" },
      }),
      stackFrame(values.slice(0, -2), `Pop ${under} and hold it too.`, {
        held: { value: under, label: "held" },
      }),
      stackFrame([...values.slice(0, -2), top], `Push ${top} back first.`, {
        active: [values.length - 2],
      }),
      stackFrame(next, `Push ${under} on top of it — they are swapped.`, {
        active: [next.length - 1],
        found: next.length - 1,
      }),
    ],
    summary: `Swapped the top two of ${name}: ${under} sits on ${top} now. Two pops and two pushes — a stack cannot reorder in place.`,
    complexity: STACK_COMPLEXITY.pop,
    meta: { swapped: [top, under] },
  };
}

/**
 * Reverse the stack using a second stack.
 *
 * Shown as items moving out to a helper and back, because the point of the
 * exercise is that a stack reverses whatever passes through it — which is
 * also why one is enough to reverse a string.
 */
export function reverseStack(values: ArrayValue[], name = "S"): ArrayOpResult {
  if (values.length < 2) {
    return refuse(values, `${name} needs at least two items to be worth reversing.`);
  }

  const frames = [topFrame(values, `Reversing ${name} through a helper stack.`)];
  let current = [...values];
  const helper: string[] = [];

  while (current.length > 0) {
    const top = current[current.length - 1];
    current = current.slice(0, -1);
    helper.push(top);
    frames.push(
      stackFrame(
        current,
        `Pop ${top} onto the helper. The helper holds ${helper.join(", ")}.`,
        {
          active: current.length ? [current.length - 1] : [],
          held: { value: top, label: "helper" },
        },
      ),
    );
  }

  // Coming back, the helper's bottom is the original top — so returning them
  // in the order they went in is exactly the reversal.
  while (helper.length > 0) {
    const value = helper.shift() as string;
    current = [...current, value];
    frames.push(
      stackFrame(current, `Push ${value} back — it came off the helper's bottom.`, {
        active: [current.length - 1],
      }),
    );
  }
  frames.push(topFrame(current, `Reversed. Top is ${current[current.length - 1]}.`));

  return {
    values: current,
    frames,
    summary: `Reversed ${name}: what was at the bottom (${values[0]}) is on top now. One stack reverses whatever passes through it — that is the whole trick behind reversing a string.`,
    complexity: STACK_COMPLEXITY.reverse_stack,
    meta: { before: values, after: current },
  };
}
