import { createRegularExpressionModel, type RegularExpressionAst, type RegularExpressionModel } from "@/features/regular-expression/model";
import { tokenizeRegularExpression, type RegularExpressionToken, type TokenizationError } from "@/features/regular-expression/tokenizer";

export type ParseErrorCode = "EMPTY_EXPRESSION" | "UNMATCHED_OPEN_PAREN" | "UNMATCHED_CLOSE_PAREN" | "DANGLING_UNION" | "DANGLING_STAR" | "MALFORMED_GROUP" | "UNEXPECTED_TOKEN";
export type RegularExpressionParseError = { code: ParseErrorCode | TokenizationError["code"]; message: string; start: number; end: number };
export type ParseResult = { ok: true; value: RegularExpressionModel } | { ok: false; errors: RegularExpressionParseError[] };

const startsOperand = (token: RegularExpressionToken) => ["literal", "epsilon", "empty-set", "left-paren"].includes(token.type);
const nodeId = (type: string, start: number, end: number) => `${type}:${start}:${end}`;

class Parser {
  private index = 0;
  private readonly errors: RegularExpressionParseError[] = [];
  constructor(private readonly source: string, private readonly tokens: RegularExpressionToken[]) {}
  private get current() { return this.tokens[this.index] as RegularExpressionToken; }
  private advance() { const token = this.current; if (this.index < this.tokens.length - 1) this.index += 1; return token; }
  private error(code: ParseErrorCode, message: string, token = this.current) { this.errors.push({ code, message, start: token.start, end: token.end }); }

  parse(): ParseResult {
    if (this.current.type === "eof") return { ok: false, errors: [{ code: "EMPTY_EXPRESSION", message: "A regular expression cannot be empty.", start: 0, end: 0 }] };
    const root = this.parseUnion();
    const trailing = this.tokens[this.index] as RegularExpressionToken;
    if (trailing.type === "right-paren") this.error("UNMATCHED_CLOSE_PAREN", "Closing parenthesis has no matching opening parenthesis.", trailing);
    else if (trailing.type !== "eof") this.error("UNEXPECTED_TOKEN", `Unexpected token "${trailing.value}".`, trailing);
    return root && this.errors.length === 0 ? { ok: true, value: createRegularExpressionModel(this.source, root) } : { ok: false, errors: this.errors };
  }

  private parseUnion(): RegularExpressionAst | null {
    let left = this.parseConcatenation();
    while (left && this.current.type === "union") {
      const operator = this.advance();
      if (!startsOperand(this.current)) { this.error("DANGLING_UNION", "Union operator needs an expression on its right.", operator); return null; }
      const right = this.parseConcatenation();
      if (!right) return null;
      left = { type: "union", id: nodeId("union", left.span.start, right.span.end), span: { start: left.span.start, end: right.span.end }, left, right };
    }
    return left;
  }

  private parseConcatenation(): RegularExpressionAst | null {
    let left = this.parsePostfix();
    while (left && startsOperand(this.current)) {
      const right = this.parsePostfix();
      if (!right) return null;
      left = { type: "concatenation", id: nodeId("concatenation", left.span.start, right.span.end), span: { start: left.span.start, end: right.span.end }, left, right };
    }
    return left;
  }

  private parsePostfix(): RegularExpressionAst | null {
    let expression = this.parsePrimary();
    while (expression && this.current.type === "star") {
      const operator = this.advance();
      expression = { type: "kleene-star", id: nodeId("kleene-star", expression.span.start, operator.end), span: { start: expression.span.start, end: operator.end }, expression };
    }
    return expression;
  }

  private parsePrimary(): RegularExpressionAst | null {
    const token = this.current;
    if (token.type === "literal") { this.advance(); return { type: "literal", id: nodeId("literal", token.start, token.end), span: { start: token.start, end: token.end }, value: token.value }; }
    if (token.type === "epsilon") { this.advance(); return { type: "epsilon", id: nodeId("epsilon", token.start, token.end), span: { start: token.start, end: token.end } }; }
    if (token.type === "empty-set") { this.advance(); return { type: "empty-set", id: nodeId("empty-set", token.start, token.end), span: { start: token.start, end: token.end } }; }
    if (token.type === "left-paren") {
      const open = this.advance();
      if (this.current.type === "right-paren") { this.error("MALFORMED_GROUP", "Groups cannot be empty.", this.current); return null; }
      const expression = this.parseUnion();
      if (!expression) return null;
      const closeCandidate = this.tokens[this.index] as RegularExpressionToken;
      if (closeCandidate.type !== "right-paren") { this.error("UNMATCHED_OPEN_PAREN", "Opening parenthesis has no matching closing parenthesis.", open); return null; }
      const close = this.advance();
      return { type: "group", id: nodeId("group", open.start, close.end), span: { start: open.start, end: close.end }, expression };
    }
    if (token.type === "star") this.error("DANGLING_STAR", "Kleene star needs an expression on its left.", token);
    else if (token.type === "right-paren") this.error("UNMATCHED_CLOSE_PAREN", "Closing parenthesis has no matching opening parenthesis.", token);
    else this.error("UNEXPECTED_TOKEN", "Expected a literal, ε, ∅, or group.", token);
    return null;
  }
}

export function parseRegularExpression(source: string): ParseResult {
  const tokenization = tokenizeRegularExpression(source);
  if (tokenization.errors.length) return { ok: false, errors: tokenization.errors };
  return new Parser(source, tokenization.tokens).parse();
}
