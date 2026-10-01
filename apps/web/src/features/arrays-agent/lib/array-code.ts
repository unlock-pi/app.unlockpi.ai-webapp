import type { ArrayValue } from "@/features/arrays-agent/lib/array-types";

export type CodeLanguageName =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "cpp"
  | "c";

/** Numbers render bare; anything else is quoted, so the code stays valid. */
function literal(value: ArrayValue): string {
  const asNumber = Number(value);
  return value !== "" && Number.isFinite(asNumber) ? String(asNumber) : `"${value}"`;
}

function allNumeric(values: ArrayValue[]): boolean {
  return values.every((value) => value !== "" && Number.isFinite(Number(value)));
}

/**
 * Render the array as a declaration in the requested language.
 *
 * Deliberately one line plus a length comment rather than a full program: the
 * point is for the class to see the SAME array they are watching on the strip
 * written the way they will type it, not to read a listing.
 */
export function generateArrayCode(
  name: string,
  values: ArrayValue[],
  language: CodeLanguageName,
): string {
  const items = values.map(literal).join(", ");
  const numeric = allNumeric(values);
  const size = values.length;

  switch (language) {
    case "python":
      return `${name} = [${items}]\n# length: ${size}  •  valid indices: 0..${Math.max(size - 1, 0)}`;
    case "java":
      return `${numeric ? "int" : "String"}[] ${name} = {${items}};\n// length: ${size}  •  valid indices: 0..${Math.max(size - 1, 0)}`;
    case "cpp":
      return `${numeric ? "int" : "std::string"} ${name}[${size}] = {${items}};\n// length: ${size}  •  valid indices: 0..${Math.max(size - 1, 0)}`;
    case "c":
      return `${numeric ? "int" : "char*"} ${name}[${size}] = {${items}};\n/* length: ${size}  •  valid indices: 0..${Math.max(size - 1, 0)} */`;
    case "typescript":
      return `const ${name}: ${numeric ? "number" : "string"}[] = [${items}];\n// length: ${size}  •  valid indices: 0..${Math.max(size - 1, 0)}`;
    default:
      return `const ${name} = [${items}];\n// length: ${size}  •  valid indices: 0..${Math.max(size - 1, 0)}`;
  }
}

export type ParsedArrayCode = { name: string | null; values: string[] };

/**
 * Pull an array literal back out of a code block.
 *
 * Handles the declaration forms `generateArrayCode` emits across all six
 * languages plus the plain forms a teacher is likely to type by hand. Returns
 * null rather than guessing when there is no literal — a wrong guess would
 * silently replace the class's array.
 */
export function parseArrayFromCode(code: string): ParsedArrayCode | null {
  // Ignore comments so a commented-out example can't be picked up instead of
  // the real declaration.
  const source = code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").replace(/#.*$/, ""))
    .join("\n");

  // `name = [ ... ]` or `name[5] = { ... }`, with any type prefix.
  const match =
    /(?:^|[\s;])([A-Za-z_$][\w$]*)\s*(?:\[\s*\d*\s*\])?\s*(?::[^=]+)?=\s*[[{]([^\]}]*)[\]}]/.exec(
      source,
    );
  if (!match) return null;

  const [, name, body] = match;
  const trimmed = body.trim();
  if (trimmed === "") return { name, values: [] };

  const values = trimmed
    .split(",")
    .map((entry) => entry.trim().replace(/^['"`]|['"`]$/g, "").trim())
    .filter((entry) => entry.length > 0);

  return values.length ? { name, values } : { name, values: [] };
}

/**
 * How the teacher wrote their declaration. Preserved so the agent never
 * rewrites `A = [1, 2, 3]` into `const A = [1, 2, 3]` behind their back — the
 * values are kept in sync, the style is theirs.
 */
export type DeclarationStyle = "bare" | "let" | "const" | "var";

export function parseDeclarationStyle(code: string): DeclarationStyle | null {
  const line = code
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => /=\s*[[{]/.test(entry));
  if (!line) return null;
  if (/^const\s/.test(line)) return "const";
  if (/^let\s/.test(line)) return "let";
  if (/^var\s/.test(line)) return "var";
  return "bare";
}

/** The declaration line on its own, in the teacher's style. */
export function declarationLine(
  name: string,
  values: ArrayValue[],
  language: CodeLanguageName,
  style: DeclarationStyle = "bare",
): string {
  if (language !== "javascript") {
    // Other languages have one idiomatic form; only JS has the keyword choice.
    return generateArrayCode(name, values, language).split("\n")[0];
  }
  const items = values.map(literal).join(", ");
  const keyword = style === "bare" ? "" : `${style} `;
  return `${keyword}${name} = [${items}]`;
}

const MAX_CARET_WIDTH = 72;

/**
 * The whole code block: what the array is, then what was just done to it, with
 * the operation underlined the way a teacher would underline it on a
 * whiteboard.
 *
 * The underline is plain carets rather than editor-style line highlighting
 * because the block is rendered by a syntax highlighter that has no concept of
 * "the current line" — and carets survive copy-paste into notes.
 */
export function buildSyncedCode(input: {
  name: string;
  values: ArrayValue[];
  language: CodeLanguageName;
  style?: DeclarationStyle;
  operation?: { line: string; explanation: string } | null;
}): string {
  const declaration = declarationLine(input.name, input.values, input.language, input.style);
  const comment = input.language === "python" ? "#" : "//";
  const header = `${declaration}\n${comment} ${input.values.length} element(s) · indices 0..${Math.max(input.values.length - 1, 0)}`;

  if (!input.operation) return header;

  const lines = input.operation.line.split("\n");
  const widest = Math.min(
    MAX_CARET_WIDTH,
    Math.max(...lines.map((line) => line.trimEnd().length)),
  );
  const underline = "^".repeat(Math.max(widest, 1));

  return [
    header,
    "",
    input.operation.line,
    underline,
    `${comment} ${input.operation.explanation}`,
  ].join("\n");
}
