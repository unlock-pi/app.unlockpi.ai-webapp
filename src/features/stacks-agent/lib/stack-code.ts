import type { CodeLanguageName } from "@/features/arrays-agent/lib/array-code";
import type { OperationCode } from "@/features/arrays-agent/lib/operation-code";

/**
 * The line of code for what just happened to the stack.
 *
 * Same contract as the arrays tutor's version — one line plus one sentence,
 * rendered where the code block's language is known — because the code block
 * under the board is shared between both tutors. A stack's code is shorter
 * than an array's on purpose: there are only two ways in and out.
 */

type Args = Record<string, unknown>;

function literal(value: unknown): string {
  if (value === undefined || value === null) return "";
  const text = String(value);
  return Number.isFinite(Number(text)) && text.trim() !== "" ? text : `"${text}"`;
}

function list(values: unknown): string {
  return Array.isArray(values) ? values.map(literal).join(", ") : "";
}

type Pair = { js: string; py: string; explanation: string };

function pairFor(tool: string, args: Args, name: string): Pair | null {
  switch (tool) {
    case "push":
      return {
        js: `${name}.push(${literal(args.value)})`,
        py: `${name}.append(${literal(args.value)})`,
        explanation: "Add at the top. Nothing below it moves, so this is O(1).",
      };
    case "push_multiple":
      return {
        js: `${name}.push(${list(args.values)})`,
        py: `${name}.extend([${list(args.values)}])`,
        explanation: "Pushed in order, so the last one ends up on top.",
      };
    case "pop":
      return {
        js: `${name}.pop()`,
        py: `${name}.pop()`,
        explanation: "Take the top off and hand it back. The rest never moves.",
      };
    case "pop_multiple":
      return {
        js: `for (let i = 0; i < ${args.count ?? 1}; i++) ${name}.pop();`,
        py: `for _ in range(${args.count ?? 1}):\n    ${name}.pop()`,
        explanation: "One pop per item, top first — there is no other order available.",
      };
    case "peek":
      return {
        js: `${name}[${name}.length - 1]`,
        py: `${name}[-1]`,
        explanation: "Read the top without removing it. Peek looks; pop takes.",
      };
    case "is_stack_empty":
      return {
        js: `${name}.length === 0`,
        py: `len(${name}) == 0`,
        explanation: "The check that belongs before every pop.",
      };
    case "is_stack_full":
      return {
        js: `${name}.length === capacity`,
        py: `len(${name}) == capacity`,
        explanation: "Only a fixed-size stack can be full — one that grows never is.",
      };
    case "stack_size":
      return {
        js: `${name}.length`,
        py: `len(${name})`,
        explanation: "The count is kept as the stack changes, not recounted.",
      };
    case "clear_stack":
      return {
        js: `while (${name}.length) ${name}.pop();`,
        py: `while ${name}:\n    ${name}.pop()`,
        explanation: "Clearing is n pops, not one instruction.",
      };
    case "search_stack":
      return {
        js: `while (${name}.length && ${name}[${name}.length - 1] !== ${literal(args.target)}) held.push(${name}.pop());`,
        py: `while ${name} and ${name}[-1] != ${literal(args.target)}:\n    held.append(${name}.pop())`,
        explanation: "No index to jump to — everything above the target comes off, then goes back.",
      };
    case "traverse_stack":
      return {
        js: `while (${name}.length) console.log(${name}.pop());`,
        py: `while ${name}:\n    print(${name}.pop())`,
        explanation: "Reading a stack empties it, which is why the items have to be pushed back.",
      };
    case "duplicate_top":
      return {
        js: `${name}.push(${name}[${name}.length - 1])`,
        py: `${name}.append(${name}[-1])`,
        explanation: "Peek, then push what you saw — the stack machine's DUP.",
      };
    case "swap_top_two":
      return {
        js: `const a = ${name}.pop(); const b = ${name}.pop(); ${name}.push(a); ${name}.push(b);`,
        py: `a, b = ${name}.pop(), ${name}.pop()\n${name}.append(a)\n${name}.append(b)`,
        explanation: "Two pops and two pushes; a stack cannot reorder in place.",
      };
    case "reverse_stack":
      return {
        js: `while (${name}.length) helper.push(${name}.pop());`,
        py: `while ${name}:\n    helper.append(${name}.pop())`,
        explanation: "Everything moves through a second stack, which reverses it.",
      };
    case "create_stack":
    case "create_empty_stack":
      // The declaration line already says this; a second line would repeat it.
      return null;
    default:
      return null;
  }
}

export function codeForStackOperation(
  tool: string,
  args: Args,
  name: string,
  language: CodeLanguageName = "javascript",
): OperationCode | null {
  const pair = pairFor(tool, args, name);
  if (!pair) return null;
  if (language === "javascript" || language === "typescript") {
    return { line: pair.js, explanation: pair.explanation };
  }
  if (language === "python") return { line: pair.py, explanation: pair.explanation };
  // Java, C and C++ hold a stack in a fixed array with its own top index, so
  // a one-line JavaScript call under that declaration would be a lie.
  return null;
}
