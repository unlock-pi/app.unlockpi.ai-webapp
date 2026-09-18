import type { CodeLanguageName } from "@/features/arrays-agent/lib/array-code";

/**
 * The line of code that performs each operation.
 *
 * This is the teaching half of the code block: the declaration says what the
 * array IS, and this says what was just DONE to it. Deriving it centrally from
 * the tool name and its arguments — rather than inside each of the twenty-odd
 * operations — keeps the engine free of any notion of JavaScript.
 */
export type OperationCode = {
  /** The code itself. May be several lines, for a traversal loop. */
  line: string;
  /** One sentence under the code, in classroom language. */
  explanation: string;
};

type Args = Record<string, unknown>;

/**
 * What the model asked for, kept as the tool call it was rather than rendered
 * code. The language is not known here — the code block on the canvas decides
 * it — so rendering waits until the commit reaches the bridge.
 */
export type OperationRequest = { tool: string; args: Args };

const num = (args: Args, key: string) =>
  typeof args[key] === "number" ? (args[key] as number) : undefined;

/** Numbers stay bare; anything else is quoted so the code remains valid. */
function literal(value: unknown): string {
  if (value === undefined || value === null) return "";
  const text = String(value);
  return Number.isFinite(Number(text)) && text.trim() !== "" ? text : `"${text}"`;
}

function list(values: unknown): string {
  return Array.isArray(values) ? values.map(literal).join(", ") : "";
}

const SORT_LABELS: Record<string, string> = {
  bubble_sort: "bubble sort",
  selection_sort: "selection sort",
  insertion_sort: "insertion sort",
  merge_sort: "merge sort",
  quick_sort: "quick sort",
};

function javascriptOperation(
  tool: string,
  args: Args,
  name: string,
): OperationCode | null {
  const index = num(args, "index");
  const value = args.value;

  switch (tool) {
    // Reading and writing one slot.
    case "access_array_element":
      return { line: `${name}[${index}]`, explanation: `Read the value at index ${index}.` };
    case "update_array_element":
      return {
        line: `${name}[${index}] = ${literal(value)}`,
        explanation: `Overwrite index ${index}. Nothing shifts — the array stays the same length.`,
      };

    // Insertion.
    case "insert_at_beginning":
      return {
        line: `${name}.unshift(${literal(value)})`,
        explanation: "Add at the front. Every existing element shifts one place right.",
      };
    case "insert_at_end":
      return {
        line: `${name}.push(${literal(value)})`,
        explanation: "Add at the end. Nothing has to move.",
      };
    case "insert_at_index":
      return {
        line: `${name}.splice(${index}, 0, ${literal(value)})`,
        explanation: `Insert ${literal(value)} at index ${index}; everything from there shifts right.`,
      };
    case "insert_multiple":
      return {
        line: `${name}.splice(${index}, 0, ${list(args.values)})`,
        explanation: `Insert several values starting at index ${index}.`,
      };
    case "sorted_insert":
      return {
        line: `${name}.splice(${name}.findIndex((x) => x > ${literal(value)}), 0, ${literal(value)})`,
        explanation: "Find the first larger element, then insert just before it.",
      };

    // Deletion.
    case "delete_from_beginning":
      return { line: `${name}.shift()`, explanation: "Remove the first element; the rest shift left." };
    case "delete_from_end":
      return { line: `${name}.pop()`, explanation: "Remove the last element. Nothing shifts." };
    case "delete_at_index":
      return {
        line: `${name}.splice(${index}, 1)`,
        explanation: `Remove one element at index ${index}; the tail shifts left to close the gap.`,
      };
    case "delete_multiple":
      return {
        line: `[${list(args.indices)}].sort((a, b) => b - a).forEach((i) => ${name}.splice(i, 1))`,
        explanation: "Highest index first, so the lower indices stay valid as elements move.",
      };
    case "delete_by_value":
      return args.all
        ? {
            line: `${name} = ${name}.filter((x) => x !== ${literal(args.value)})`,
            explanation: "Keep everything that is not that value.",
          }
        : {
            line: `${name}.splice(${name}.indexOf(${literal(args.value)}), 1)`,
            explanation: "Find the first match, then remove one element there.",
          };

    // Search.
    case "linear_search":
      return {
        line: `${name}.indexOf(${literal(args.target)})`,
        explanation: "Check each element from the start until it matches.",
      };
    case "binary_search":
      return {
        line: `binarySearch(${name}, ${literal(args.target)})`,
        explanation: "Halve the range each comparison. Only valid on a sorted array.",
      };
    case "find_all_occurrences":
      return {
        line: `${name}.flatMap((x, i) => (x === ${literal(args.target)} ? [i] : []))`,
        explanation: "Scan the whole array — later duplicates could still exist.",
      };

    // Traversal.
    case "traverse_array":
      return {
        line: `for (let i = 0; i < ${name}.length; i++) {\n  console.log(${name}[i]);\n}`,
        explanation: "Visit every index once, front to back.",
      };
    case "traverse_array_reverse":
      return {
        line: `for (let i = ${name}.length - 1; i >= 0; i--) {\n  console.log(${name}[i]);\n}`,
        explanation: "Same walk, starting at the last index.",
      };
    case "traverse_2d_array":
      return {
        line: `for (let r = 0; r < rows; r++) {\n  for (let c = 0; c < cols; c++) {\n    console.log(${name}[r][c]);\n  }\n}`,
        explanation: "Row-major order: the inner loop finishes a row before the outer moves on.",
      };
    case "access_multidimensional_element":
      return {
        line: `${name}[${num(args, "row")}][${num(args, "col")}]`,
        explanation: "Row first, then column.",
      };
    case "update_multidimensional_element":
      return {
        line: `${name}[${num(args, "row")}][${num(args, "col")}] = ${literal(value)}`,
        explanation: "Overwrite one cell of the grid.",
      };

    // Sorting.
    case "bubble_sort":
    case "selection_sort":
    case "insertion_sort":
    case "merge_sort":
    case "quick_sort": {
      const descending = args.order === "descending";
      return {
        line: `${name}.sort((a, b) => ${descending ? "b - a" : "a - b"}); // ${SORT_LABELS[tool]}`,
        explanation: `Put the elements in ${descending ? "descending" : "ascending"} order using ${SORT_LABELS[tool]}.`,
      };
    }

    // Measuring.
    case "analyze_array": {
      const metric = String(args.metric ?? "");
      const lines: Record<string, OperationCode> = {
        min: { line: `Math.min(...${name})`, explanation: "The smallest value." },
        max: { line: `Math.max(...${name})`, explanation: "The largest value." },
        sum: { line: `${name}.reduce((s, x) => s + x, 0)`, explanation: "Add every element together." },
        average: {
          line: `${name}.reduce((s, x) => s + x, 0) / ${name}.length`,
          explanation: "The total divided by how many there are.",
        },
        is_sorted: {
          line: `${name}.every((x, i) => i === 0 || ${name}[i - 1] <= x)`,
          explanation: "True when no element is smaller than the one before it.",
        },
        kth_smallest: {
          line: `[...${name}].sort((a, b) => a - b)[${(num(args, "k") ?? 1) - 1}]`,
          explanation: "Sort a copy, then take that position.",
        },
        kth_largest: {
          line: `[...${name}].sort((a, b) => b - a)[${(num(args, "k") ?? 1) - 1}]`,
          explanation: "Sort a copy the other way, then take that position.",
        },
        two_sum: {
          line: `${name}.find((x, i) => ${name}.slice(i + 1).includes(${literal(args.target)} - x))`,
          explanation: "Look for a partner that completes the total.",
        },
      };
      return lines[metric] ?? null;
    }

    // Rearranging.
    case "transform_array": {
      const operation = String(args.operation ?? "");
      const from = num(args, "from");
      const to = num(args, "to");
      const by = num(args, "by") ?? 1;
      const lines: Record<string, OperationCode> = {
        reverse: { line: `${name}.reverse()`, explanation: "Swap the ends and work inwards." },
        remove_duplicates: {
          line: `${name} = [...new Set(${name})]`,
          explanation: "A Set keeps only the first of each value.",
        },
        swap: {
          line: `[${name}[${from}], ${name}[${to}]] = [${name}[${to}], ${name}[${from}]]`,
          explanation: "Exchange two known addresses; nothing else moves.",
        },
        rotate: {
          line: `${name}.push(...${name}.splice(0, ${by}))`,
          explanation: `Take the first ${by} element(s) off the front and put them on the end.`,
        },
        shuffle: {
          line: `for (let i = ${name}.length - 1; i > 0; i--) {\n  const j = Math.floor(Math.random() * (i + 1));\n  [${name}[i], ${name}[j]] = [${name}[j], ${name}[i]];\n}`,
          explanation: "Fisher–Yates: swap each element with a random earlier one.",
        },
      };
      return lines[operation] ?? null;
    }

    // Two arrays.
    case "combine_arrays": {
      const operation = String(args.operation ?? "");
      const a = String(args.first ?? "A");
      const b = String(args.second ?? "B");
      const lines: Record<string, OperationCode> = {
        concatenate: {
          line: `const ${name} = ${a}.concat(${b})`,
          explanation: "Copy both arrays, in order, into a new one. Neither original changes.",
        },
        add: {
          line: `const ${name} = ${a}.map((x, i) => x + ${b}[i])`,
          explanation: "Pair up the indices and add each pair.",
        },
        merge_sorted: {
          line: `const ${name} = merge(${a}, ${b})`,
          explanation: "Repeatedly take the smaller of the two fronts.",
        },
      };
      return lines[operation] ?? null;
    }

    default:
      // Creation, navigation, panel toggles and the rest have no meaningful
      // single line — the declaration above already says what the array is.
      return null;
  }
}


/**
 * The same operation in Python.
 *
 * Only the syntax changes — the explanation underneath is classroom language
 * and is shared. Anything not listed here has no honest one-line Python form,
 * and the block shows the declaration alone rather than a line that would be
 * wrong.
 */
function pythonLine(tool: string, args: Args, name: string): string | null {
  const index = num(args, "index");
  const value = args.value;

  switch (tool) {
    case "access_array_element":
      return `${name}[${index}]`;
    case "update_array_element":
      return `${name}[${index}] = ${literal(value)}`;

    case "insert_at_beginning":
      return `${name}.insert(0, ${literal(value)})`;
    case "insert_at_end":
      return `${name}.append(${literal(value)})`;
    case "insert_at_index":
      return `${name}.insert(${index}, ${literal(value)})`;
    case "insert_multiple":
      return `${name}[${index}:${index}] = [${list(args.values)}]`;
    case "sorted_insert":
      return `bisect.insort(${name}, ${literal(value)})`;

    case "delete_from_beginning":
      return `${name}.pop(0)`;
    case "delete_from_end":
      return `${name}.pop()`;
    case "delete_at_index":
      return `del ${name}[${index}]`;
    case "delete_multiple":
      return `for i in sorted([${list(args.indices)}], reverse=True):\n    del ${name}[i]`;
    case "delete_by_value":
      return args.all
        ? `${name} = [x for x in ${name} if x != ${literal(args.value)}]`
        : `${name}.remove(${literal(args.value)})`;

    case "linear_search":
      return `${name}.index(${literal(args.target)})`;
    case "binary_search":
      return `bisect.bisect_left(${name}, ${literal(args.target)})`;
    case "find_all_occurrences":
      return `[i for i, x in enumerate(${name}) if x == ${literal(args.target)}]`;

    case "traverse_array":
      return `for i in range(len(${name})):\n    print(${name}[i])`;
    case "traverse_array_reverse":
      return `for i in range(len(${name}) - 1, -1, -1):\n    print(${name}[i])`;
    case "traverse_2d_array":
      return `for r in range(rows):\n    for c in range(cols):\n        print(${name}[r][c])`;
    case "access_multidimensional_element":
      return `${name}[${num(args, "row")}][${num(args, "col")}]`;
    case "update_multidimensional_element":
      return `${name}[${num(args, "row")}][${num(args, "col")}] = ${literal(value)}`;

    case "bubble_sort":
    case "selection_sort":
    case "insertion_sort":
    case "merge_sort":
    case "quick_sort":
      return `${name}.sort(${args.order === "descending" ? "reverse=True" : ""})  # ${SORT_LABELS[tool]}`;

    case "analyze_array": {
      const k = (num(args, "k") ?? 1) - 1;
      const lines: Record<string, string> = {
        min: `min(${name})`,
        max: `max(${name})`,
        sum: `sum(${name})`,
        average: `sum(${name}) / len(${name})`,
        is_sorted: `all(${name}[i - 1] <= ${name}[i] for i in range(1, len(${name})))`,
        kth_smallest: `sorted(${name})[${k}]`,
        kth_largest: `sorted(${name}, reverse=True)[${k}]`,
        two_sum: `next((x for i, x in enumerate(${name}) if ${literal(args.target)} - x in ${name}[i + 1:]), None)`,
      };
      return lines[String(args.metric ?? "")] ?? null;
    }

    case "transform_array": {
      const by = num(args, "by") ?? 1;
      const from = num(args, "from");
      const to = num(args, "to");
      const lines: Record<string, string> = {
        reverse: `${name}.reverse()`,
        remove_duplicates: `${name} = list(dict.fromkeys(${name}))`,
        swap: `${name}[${from}], ${name}[${to}] = ${name}[${to}], ${name}[${from}]`,
        rotate: `${name} = ${name}[${by}:] + ${name}[:${by}]`,
        shuffle: `random.shuffle(${name})`,
      };
      return lines[String(args.operation ?? "")] ?? null;
    }

    case "combine_arrays": {
      const a = String(args.first ?? "A");
      const b = String(args.second ?? "B");
      const lines: Record<string, string> = {
        concatenate: `${name} = ${a} + ${b}`,
        add: `${name} = [x + y for x, y in zip(${a}, ${b})]`,
        merge_sorted: `${name} = list(heapq.merge(${a}, ${b}))`,
      };
      return lines[String(args.operation ?? "")] ?? null;
    }

    default:
      return null;
  }
}

/**
 * The line of code for what just happened, in the language the code block is
 * written in.
 *
 * Java, C and C++ get the declaration only: their arrays are fixed-size and
 * most of these operations are a loop or a library call rather than a line, so
 * a JavaScript line under a Java declaration would teach the wrong thing.
 */
export function codeForOperation(
  tool: string,
  args: Args,
  name: string,
  language: CodeLanguageName = "javascript",
): OperationCode | null {
  const js = javascriptOperation(tool, args, name);
  if (!js) return null;
  if (language === "javascript" || language === "typescript") return js;
  if (language !== "python") return null;

  const line = pythonLine(tool, args, name);
  return line ? { line, explanation: js.explanation } : null;
}
