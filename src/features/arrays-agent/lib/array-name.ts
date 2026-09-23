export const DEFAULT_ARRAY_NAME = "A";

/**
 * The letter drawn beside an array strip, taken from the block's title.
 *
 * The title is free text a teacher can type, but the name also ends up in
 * generated code, so it has to be a usable identifier. "Array A" — the old
 * default — yields "A" rather than something that would produce
 * `const Array A = [...]`.
 */
export function arrayNameFromTitle(title?: string): string {
  const raw = (title ?? "").trim();
  if (!raw) return DEFAULT_ARRAY_NAME;
  if (isIdentifier(raw)) return raw;
  const last = raw.split(/\s+/).pop() ?? "";
  return isIdentifier(last) ? last : DEFAULT_ARRAY_NAME;
}

export const DEFAULT_STACK_NAME = "S";

/**
 * The same, for a stack.
 *
 * Only the fallback differs: an untitled array is A and an untitled stack is
 * S, which is what the textbooks and the generated code both use.
 */
export function stackNameFromTitle(title?: string): string {
  const raw = (title ?? "").trim();
  if (!raw) return DEFAULT_STACK_NAME;
  const derived = arrayNameFromTitle(raw);
  return derived === DEFAULT_ARRAY_NAME && !/^a$/i.test(raw) && !/\ba\b/i.test(raw)
    ? DEFAULT_STACK_NAME
    : derived;
}

/** A, then B, then C… skipping any name already on the frame. */
export function nextArrayName(existing: string[]): string {
  const taken = new Set(existing.map((name) => name.toUpperCase()));
  for (let code = 65; code <= 90; code++) {
    const candidate = String.fromCharCode(code);
    if (!taken.has(candidate)) return candidate;
  }
  return `A${existing.length + 1}`;
}

function isIdentifier(value: string) {
  return /^[A-Za-z_$][\w$]*$/.test(value);
}
