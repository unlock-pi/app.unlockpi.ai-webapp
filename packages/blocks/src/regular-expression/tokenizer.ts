export type RegularExpressionTokenType = "literal" | "epsilon" | "empty-set" | "union" | "star" | "left-paren" | "right-paren" | "eof";
export type RegularExpressionToken = { type: RegularExpressionTokenType; value: string; start: number; end: number };
export type TokenizationError = { code: "INVALID_SYMBOL"; message: string; start: number; end: number };
export type TokenizationResult = { tokens: RegularExpressionToken[]; errors: TokenizationError[] };

const tokenTypes: Record<string, RegularExpressionTokenType> = { "|": "union", "*": "star", "(": "left-paren", ")": "right-paren", "ε": "epsilon", "∅": "empty-set" };
const unsupportedSymbols = new Set(["+", "?", ".", "[", "]", "{", "}", "^", "$"]);

/** Tokenizes exactly the educational RE syntax; whitespace and unsupported operators are errors. */
export function tokenizeRegularExpression(source: string): TokenizationResult {
  const tokens: RegularExpressionToken[] = [];
  const errors: TokenizationError[] = [];
  for (let start = 0; start < source.length;) {
    const value = String.fromCodePoint(source.codePointAt(start) as number);
    const end = start + value.length;
    const type = tokenTypes[value];
    if (type) tokens.push({ type, value, start, end });
    else if (/\s/u.test(value)) errors.push({ code: "INVALID_SYMBOL", message: "Whitespace is not part of the supported regular-expression syntax.", start, end });
    else if (unsupportedSymbols.has(value)) errors.push({ code: "INVALID_SYMBOL", message: `Unsupported regular-expression symbol "${value}".`, start, end });
    else tokens.push({ type: "literal", value, start, end });
    start = end;
  }
  tokens.push({ type: "eof", value: "", start: source.length, end: source.length });
  return { tokens, errors };
}
