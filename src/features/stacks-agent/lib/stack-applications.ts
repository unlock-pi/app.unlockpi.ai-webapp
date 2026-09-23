import type {
  ArrayFrame,
  ArrayOpResult,
} from "@/features/arrays-agent/lib/array-types";
import {
  MAX_STACK_HEIGHT,
  STACK_COMPLEXITY,
  stackFrame,
  topFrame,
} from "@/features/stacks-agent/lib/stack-frames";

/**
 * What stacks are FOR.
 *
 * Push and pop on their own do not explain why the structure exists; these do.
 * Every one of them runs on the same frames as the plain operations, so the
 * class watches the same bucket fill and drain whether the lesson is "push 5"
 * or "check these brackets".
 *
 * Each returns the stack as it ends up — usually empty, because a finished
 * algorithm has put everything back — with the answer in the summary and the
 * working in `meta`.
 */

export type StackApplication =
  | "balanced_parentheses"
  | "reverse_sequence"
  | "infix_to_postfix"
  | "evaluate_postfix"
  | "decimal_to_binary"
  | "next_greater_element"
  | "undo_history"
  | "call_stack";

function refuse(summary: string): ArrayOpResult {
  return { values: [], frames: [stackFrame([], summary)], summary, rejected: true };
}

/** Frames cost real classroom time, so long inputs are turned away early. */
function tooLong(what: string, limit: number): ArrayOpResult {
  return refuse(
    `Keep it to ${limit} ${what} or fewer — past that the stack outgrows the frame and the class cannot see what is happening.`,
  );
}

const OPENERS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 };

// ── Are these brackets balanced? ───────────────────────────────────────

export function balancedParentheses(input: string, name = "S"): ArrayOpResult {
  const text = input.trim();
  if (!text) return refuse("Give me an expression with brackets in it, like (a + [b]).");
  if (text.length > 30) return tooLong("characters", 30);

  const frames: ArrayFrame[] = [stackFrame([], `Checking ${text}. ${name} starts empty.`)];
  let stack: string[] = [];
  let verdict: string | null = null;

  for (let index = 0; index < text.length && verdict === null; index += 1) {
    const char = text[index];

    if (char === "(" || char === "[" || char === "{") {
      if (stack.length >= MAX_STACK_HEIGHT) {
        return refuse(
          `That expression nests more than ${MAX_STACK_HEIGHT} brackets deep, which is more than this stack can show.`,
        );
      }
      stack = [...stack, char];
      frames.push(
        stackFrame(stack, `${char} is an opener — push it and remember it is waiting.`, {
          active: [stack.length - 1],
          found: stack.length - 1,
        }),
      );
      continue;
    }

    if (char in OPENERS) {
      const expected = OPENERS[char];
      if (stack.length === 0) {
        frames.push(
          stackFrame(stack, `${char} closes something, but ${name} is empty — nothing was opened.`),
        );
        verdict = `Not balanced: ${char} at position ${index + 1} closes a bracket that was never opened.`;
        break;
      }
      const top = stack[stack.length - 1];
      frames.push(
        stackFrame(stack, `${char} closes. Top is ${top} — ${top === expected ? "they match." : "wrong kind."}`, {
          active: [stack.length - 1],
          found: top === expected ? stack.length - 1 : undefined,
        }),
      );
      if (top !== expected) {
        verdict = `Not balanced: ${char} at position ${index + 1} does not close ${top}.`;
        break;
      }
      stack = stack.slice(0, -1);
      frames.push(
        stackFrame(stack, `Matched pair — pop ${top}.`, {
          active: stack.length ? [stack.length - 1] : [],
        }),
      );
    }
  }

  if (verdict === null) {
    verdict =
      stack.length === 0
        ? `Balanced. Every opener found its closer, and ${name} ended empty — which is the test.`
        : `Not balanced: ${stack.length} bracket(s) were opened and never closed (${stack.join(", ")} still on the stack).`;
    frames.push(
      topFrame(
        stack,
        stack.length === 0 ? `${name} is empty — balanced.` : `${name} still holds ${stack.join(", ")} — not balanced.`,
      ),
    );
  }

  return {
    values: stack,
    frames,
    summary: `${text} → ${verdict}`,
    complexity: STACK_COMPLEXITY.balanced_parentheses,
    meta: { input: text, balanced: verdict.startsWith("Balanced"), leftOver: stack },
  };
}

// ── A stack reverses whatever passes through it ────────────────────────

export function reverseSequence(items: string[], name = "S"): ArrayOpResult {
  const values = items.map((item) => item.trim()).filter(Boolean);
  if (values.length < 2) return refuse("Give me at least two things to reverse.");
  if (values.length > MAX_STACK_HEIGHT) return tooLong("items", MAX_STACK_HEIGHT);

  const frames: ArrayFrame[] = [stackFrame([], `Pushing ${values.join(", ")} onto ${name}, in order.`)];
  let stack: string[] = [];
  values.forEach((value) => {
    stack = [...stack, value];
    frames.push(
      stackFrame(stack, `Push ${value}.`, { active: [stack.length - 1] }),
    );
  });

  const out: string[] = [];
  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    out.push(top);
    stack = stack.slice(0, -1);
    frames.push(
      stackFrame(stack, `Pop ${top} — reading order so far: ${out.join(", ")}.`, {
        active: stack.length ? [stack.length - 1] : [],
        held: { value: top, label: "out" },
      }),
    );
  }
  frames.push(stackFrame([], `${name} is empty. Out came ${out.join(", ")}.`));

  return {
    values: [],
    frames,
    summary: `${values.join(", ")} went in; ${out.join(", ")} came out. Last in, first out is exactly a reversal — no second structure needed.`,
    complexity: STACK_COMPLEXITY.reverse_stack,
    meta: { input: values, reversed: out },
  };
}

// ── Infix to postfix ───────────────────────────────────────────────────

function tokenize(expression: string): string[] {
  return expression.match(/\d+(\.\d+)?|[A-Za-z]+|[+\-*/^()]/g) ?? [];
}

export function infixToPostfix(expression: string, name = "S"): ArrayOpResult {
  const tokens = tokenize(expression);
  if (tokens.length === 0) return refuse("Give me an expression like a + b * c.");
  if (tokens.length > 15) return tooLong("tokens", 15);

  const frames: ArrayFrame[] = [
    stackFrame([], `Converting ${expression}. ${name} holds operators only.`),
  ];
  let stack: string[] = [];
  const output: string[] = [];

  for (const token of tokens) {
    if (/^[\w.]+$/.test(token)) {
      output.push(token);
      frames.push(
        topFrame(stack, `${token} is an operand — straight to the output: ${output.join(" ")}.`),
      );
      continue;
    }

    if (token === "(") {
      stack = [...stack, token];
      frames.push(
        stackFrame(stack, `Push ( — it holds the operators inside it together.`, {
          active: [stack.length - 1],
        }),
      );
      continue;
    }

    if (token === ")") {
      while (stack.length > 0 && stack[stack.length - 1] !== "(") {
        const operator = stack[stack.length - 1];
        stack = stack.slice(0, -1);
        output.push(operator);
        frames.push(
          stackFrame(stack, `Pop ${operator} into the output: ${output.join(" ")}.`, {
            active: stack.length ? [stack.length - 1] : [],
            held: { value: operator, label: "out" },
          }),
        );
      }
      stack = stack.slice(0, -1);
      frames.push(stackFrame(stack, `Pop the ( and throw it away — brackets never reach postfix.`));
      continue;
    }

    while (
      stack.length > 0 &&
      stack[stack.length - 1] !== "(" &&
      PRECEDENCE[stack[stack.length - 1]] >= PRECEDENCE[token] &&
      !(token === "^" && stack[stack.length - 1] === "^")
    ) {
      const operator = stack[stack.length - 1];
      stack = stack.slice(0, -1);
      output.push(operator);
      frames.push(
        stackFrame(stack, `${operator} binds at least as tightly as ${token}, so it goes out first: ${output.join(" ")}.`, {
          active: stack.length ? [stack.length - 1] : [],
          held: { value: operator, label: "out" },
        }),
      );
    }
    stack = [...stack, token];
    frames.push(
      stackFrame(stack, `Push ${token} and wait for its right-hand side.`, {
        active: [stack.length - 1],
      }),
    );
  }

  while (stack.length > 0) {
    const operator = stack[stack.length - 1];
    stack = stack.slice(0, -1);
    output.push(operator);
    frames.push(
      stackFrame(stack, `Nothing left to read — pop ${operator}: ${output.join(" ")}.`, {
        active: stack.length ? [stack.length - 1] : [],
        held: { value: operator, label: "out" },
      }),
    );
  }
  frames.push(stackFrame([], `${name} is empty. Postfix: ${output.join(" ")}.`));

  return {
    values: [],
    frames,
    summary: `${expression} in postfix is ${output.join(" ")}. The stack held each operator until something tighter had finished — which is how precedence gets applied without brackets.`,
    complexity: STACK_COMPLEXITY.infix_to_postfix,
    meta: { infix: expression, postfix: output.join(" ") },
  };
}

// ── Evaluating postfix ─────────────────────────────────────────────────

export function evaluatePostfix(expression: string, name = "S"): ArrayOpResult {
  const tokens = expression.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return refuse("Give me a postfix expression like 5 3 + 2 *.");
  if (tokens.length > 15) return tooLong("tokens", 15);

  const frames: ArrayFrame[] = [stackFrame([], `Evaluating ${expression}. ${name} holds the operands.`)];
  let stack: string[] = [];

  for (const token of tokens) {
    if (token in PRECEDENCE) {
      if (stack.length < 2) {
        return refuse(
          `${expression} is not valid postfix: ${token} needs two operands and ${name} holds ${stack.length}.`,
        );
      }
      const right = Number(stack[stack.length - 1]);
      const left = Number(stack[stack.length - 2]);
      stack = stack.slice(0, -2);
      frames.push(
        stackFrame(stack, `${token} takes the top two: ${left} and ${right}.`, {
          held: { value: `${left} ${token} ${right}`, label: "working" },
        }),
      );
      const result =
        token === "+"
          ? left + right
          : token === "-"
            ? left - right
            : token === "*"
              ? left * right
              : token === "/"
                ? right === 0
                  ? NaN
                  : left / right
                : left ** right;
      if (!Number.isFinite(result)) {
        return refuse(`That expression divides by zero at ${left} ${token} ${right}.`);
      }
      stack = [...stack, String(result)];
      frames.push(
        stackFrame(stack, `Push the answer, ${result}, back on.`, {
          active: [stack.length - 1],
          found: stack.length - 1,
        }),
      );
      continue;
    }

    if (Number.isNaN(Number(token))) {
      return refuse(`${token} is neither a number nor an operator, so this is not postfix.`);
    }
    if (stack.length >= MAX_STACK_HEIGHT) {
      return refuse(`That expression needs more than ${MAX_STACK_HEIGHT} operands waiting at once.`);
    }
    stack = [...stack, token];
    frames.push(
      stackFrame(stack, `${token} is an operand — push it and wait for an operator.`, {
        active: [stack.length - 1],
      }),
    );
  }

  if (stack.length !== 1) {
    return refuse(
      `${expression} left ${stack.length} values on ${name}. Valid postfix ends with exactly one — the answer.`,
    );
  }

  const answer = stack[0];
  frames.push(topFrame(stack, `One value left: ${answer}. That is the answer.`));
  return {
    values: stack,
    frames,
    summary: `${expression} = ${answer}. Operands wait on the stack; each operator takes the two nearest and pushes its result back — no brackets and no precedence rules needed.`,
    complexity: STACK_COMPLEXITY.evaluate_postfix,
    meta: { postfix: expression, answer },
  };
}

// ── Decimal to binary ──────────────────────────────────────────────────

export function decimalToBinary(value: number, name = "S"): ArrayOpResult {
  if (!Number.isInteger(value) || value < 0) {
    return refuse("Give me a whole number that is zero or more.");
  }
  if (value > 255) return refuse("Keep it under 256 so the remainders fit on the stack.");
  if (value === 0) {
    return {
      values: ["0"],
      frames: [stackFrame(["0"], "Zero is already 0 in binary.", { active: [0] })],
      summary: "0 in binary is 0.",
      meta: { decimal: 0, binary: "0" },
    };
  }

  const frames: ArrayFrame[] = [
    stackFrame([], `Dividing ${value} by 2 and pushing each remainder onto ${name}.`),
  ];
  let stack: string[] = [];
  let current = value;
  while (current > 0) {
    const remainder = current % 2;
    stack = [...stack, String(remainder)];
    frames.push(
      stackFrame(stack, `${current} ÷ 2 = ${Math.floor(current / 2)} remainder ${remainder} — push it.`, {
        active: [stack.length - 1],
      }),
    );
    current = Math.floor(current / 2);
  }

  const bits: string[] = [];
  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    bits.push(top);
    stack = stack.slice(0, -1);
    frames.push(
      stackFrame(stack, `Pop ${top} — reading so far: ${bits.join("")}.`, {
        active: stack.length ? [stack.length - 1] : [],
        held: { value: top, label: "bit" },
      }),
    );
  }

  const binary = bits.join("");
  frames.push(stackFrame([], `${value} in binary is ${binary}.`));
  return {
    values: [],
    frames,
    summary: `${value} in binary is ${binary}. The remainders come out last-first, which is exactly the order binary needs — the stack does the reversing for you.`,
    complexity: STACK_COMPLEXITY.reverse_stack,
    meta: { decimal: value, binary },
  };
}

// ── Next greater element ───────────────────────────────────────────────

export function nextGreaterElement(input: number[], name = "S"): ArrayOpResult {
  if (input.length < 2) return refuse("Give me at least two numbers.");
  if (input.length > MAX_STACK_HEIGHT) return tooLong("numbers", MAX_STACK_HEIGHT);

  const frames: ArrayFrame[] = [
    stackFrame([], `Walking ${input.join(", ")} right to left. ${name} keeps the candidates.`),
  ];
  let stack: string[] = [];
  const answers = new Array<string>(input.length).fill("-1");

  for (let index = input.length - 1; index >= 0; index -= 1) {
    const value = input[index];
    while (stack.length > 0 && Number(stack[stack.length - 1]) <= value) {
      const dropped = stack[stack.length - 1];
      stack = stack.slice(0, -1);
      frames.push(
        stackFrame(stack, `${dropped} is not bigger than ${value}, so it can never be anyone's answer — pop it.`, {
          active: stack.length ? [stack.length - 1] : [],
        }),
      );
    }
    answers[index] = stack.length ? stack[stack.length - 1] : "-1";
    frames.push(
      stackFrame(
        stack,
        stack.length
          ? `Next greater than ${value} is ${answers[index]} — the top.`
          : `Nothing bigger is left to the right of ${value}.`,
        { active: stack.length ? [stack.length - 1] : [], found: stack.length ? stack.length - 1 : undefined },
      ),
    );
    stack = [...stack, String(value)];
    frames.push(
      stackFrame(stack, `Push ${value}; it is a candidate for whatever comes before it.`, {
        active: [stack.length - 1],
      }),
    );
  }

  return {
    values: stack,
    frames,
    summary: `For ${input.join(", ")} the next greater elements are ${answers.join(", ")} (-1 means none). Each number is pushed and popped at most once, so the whole thing is O(n) — not the O(n²) of comparing every pair.`,
    complexity: { time: "O(n)", space: "O(n)", reason: "Every element is pushed once and popped at most once." },
    meta: { input, answers },
  };
}

// ── Undo ───────────────────────────────────────────────────────────────

export function undoHistory(actions: string[], undoCount: number, name = "S"): ArrayOpResult {
  const steps = actions.map((action) => action.trim()).filter(Boolean);
  if (steps.length === 0) return refuse("Tell me what the student did, in order.");
  if (steps.length > MAX_STACK_HEIGHT) return tooLong("actions", MAX_STACK_HEIGHT);
  if (undoCount < 1 || undoCount > steps.length) {
    return refuse(`There are ${steps.length} action(s) to undo, so ask for between 1 and ${steps.length}.`);
  }

  const frames: ArrayFrame[] = [stackFrame([], `Every action gets pushed onto ${name} as it happens.`)];
  let stack: string[] = [];
  steps.forEach((step) => {
    stack = [...stack, step];
    frames.push(stackFrame(stack, `Did: ${step}.`, { active: [stack.length - 1] }));
  });

  const undone: string[] = [];
  for (let count = 0; count < undoCount; count += 1) {
    const top = stack[stack.length - 1];
    undone.push(top);
    stack = stack.slice(0, -1);
    frames.push(
      stackFrame(stack, `Undo — the most recent action, ${top}, is the one that comes off.`, {
        active: stack.length ? [stack.length - 1] : [],
        held: { value: top, label: "undone" },
      }),
    );
  }
  frames.push(
    topFrame(stack, stack.length ? `Last surviving action: ${stack[stack.length - 1]}.` : `Nothing left to undo.`),
  );

  return {
    values: stack,
    frames,
    summary: `Undid ${undone.join(", then ")}. Undo is a stack because the thing you want back is always the most recent one — that is the same last-in-first-out rule, with actions instead of numbers.`,
    complexity: STACK_COMPLEXITY.pop,
    meta: { actions: steps, undone, remaining: stack },
  };
}

// ── The call stack ─────────────────────────────────────────────────────

/**
 * Why recursion needs a stack.
 *
 * Each call is pushed with its own argument, the base case is where the
 * pushing stops, and the answers come back as the frames pop — which is the
 * bit students lose when it is only drawn as arrows on a whiteboard.
 */
export function callStack(n: number, name = "S"): ArrayOpResult {
  if (!Number.isInteger(n) || n < 0) return refuse("Give me a whole number, zero or more.");
  if (n > MAX_STACK_HEIGHT - 1) {
    return refuse(
      `factorial(${n}) would need ${n + 1} call frames and the stack shows ${MAX_STACK_HEIGHT}. Try a smaller number — that limit is real, and hitting it in a program is what a stack overflow is.`,
    );
  }

  const frames: ArrayFrame[] = [stackFrame([], `Calling factorial(${n}).`)];
  let stack: string[] = [];
  for (let value = n; value >= 1; value -= 1) {
    stack = [...stack, `f(${value})`];
    frames.push(
      stackFrame(stack, `f(${value}) needs f(${value - 1}) first, so it waits — push its frame.`, {
        active: [stack.length - 1],
      }),
    );
  }
  stack = [...stack, "f(0)=1"];
  frames.push(
    stackFrame(stack, `f(0) is the base case — it answers 1 without calling anything.`, {
      active: [stack.length - 1],
      found: stack.length - 1,
    }),
  );

  let answer = 1;
  stack = stack.slice(0, -1);
  frames.push(stackFrame(stack, `f(0) returns 1 and its frame is gone.`, {
    active: stack.length ? [stack.length - 1] : [],
    held: { value: "1", label: "returns" },
  }));

  for (let value = 1; value <= n; value += 1) {
    answer *= value;
    stack = stack.slice(0, -1);
    frames.push(
      stackFrame(stack, `f(${value}) multiplies ${value} by what came back: ${answer}.`, {
        active: stack.length ? [stack.length - 1] : [],
        held: { value: String(answer), label: "returns" },
      }),
    );
  }
  frames.push(stackFrame([], `${name} is empty — every call has returned. factorial(${n}) = ${answer}.`));

  return {
    values: [],
    frames,
    summary: `factorial(${n}) = ${answer}. Every call waits on the stack until the one below it answers; the base case is what stops the pushing, and without it the stack grows until it overflows.`,
    complexity: { time: "O(n)", space: "O(n)", reason: "One call frame per level of recursion, all alive at once." },
    meta: { n, answer },
  };
}
