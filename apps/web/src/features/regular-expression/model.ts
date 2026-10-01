/** Pure regular-expression AST domain model. No React, Puck, or agent dependencies. */
export type SourceSpan = { start: number; end: number };

type BaseNode = { id: string; span: SourceSpan };
export type LiteralNode = BaseNode & { type: "literal"; value: string };
export type EpsilonNode = BaseNode & { type: "epsilon" };
export type EmptySetNode = BaseNode & { type: "empty-set" };
export type UnionNode = BaseNode & { type: "union"; left: RegularExpressionAst; right: RegularExpressionAst };
export type ConcatenationNode = BaseNode & { type: "concatenation"; left: RegularExpressionAst; right: RegularExpressionAst };
export type KleeneStarNode = BaseNode & { type: "kleene-star"; expression: RegularExpressionAst };
export type GroupNode = BaseNode & { type: "group"; expression: RegularExpressionAst };

export type RegularExpressionAst = LiteralNode | EpsilonNode | EmptySetNode | UnionNode | ConcatenationNode | KleeneStarNode | GroupNode;

export type RegularExpressionModel = {
  source: string;
  root: RegularExpressionAst;
  alphabet: string[];
};

export type AstValidationIssue = {
  code: "INVALID_ID" | "INVALID_SPAN" | "INVALID_LITERAL" | "INVALID_CHILD" | "DUPLICATE_NODE_ID";
  message: string;
  nodeId?: string;
  span?: SourceSpan;
};

export type AstValidation = { valid: boolean; errors: AstValidationIssue[] };
export type AstDeserializeResult = { ok: true; value: RegularExpressionAst } | { ok: false; errors: AstValidationIssue[] };

export function astChildren(node: RegularExpressionAst): RegularExpressionAst[] {
  switch (node.type) {
    case "union":
    case "concatenation": return [node.left, node.right];
    case "kleene-star":
    case "group": return [node.expression];
    default: return [];
  }
}

export function traverseAst(root: RegularExpressionAst): RegularExpressionAst[] {
  const nodes: RegularExpressionAst[] = [];
  const visit = (node: RegularExpressionAst) => { nodes.push(node); astChildren(node).forEach(visit); };
  visit(root);
  return nodes;
}

export function findAstNode(root: RegularExpressionAst, id: string): RegularExpressionAst | null {
  return traverseAst(root).find((node) => node.id === id) ?? null;
}

export function astParentMap(root: RegularExpressionAst): Map<string, string | null> {
  const parents = new Map<string, string | null>();
  const visit = (node: RegularExpressionAst, parent: string | null) => {
    parents.set(node.id, parent);
    astChildren(node).forEach((child) => visit(child, node.id));
  };
  visit(root, null);
  return parents;
}

export function astParent(root: RegularExpressionAst, nodeId: string): RegularExpressionAst | null {
  const parentId = astParentMap(root).get(nodeId);
  return parentId ? findAstNode(root, parentId) : null;
}

export function collectLiterals(root: RegularExpressionAst): LiteralNode[] {
  return traverseAst(root).filter((node): node is LiteralNode => node.type === "literal");
}

export function collectAlphabet(root: RegularExpressionAst): string[] {
  return [...new Set(collectLiterals(root).map((node) => node.value))];
}

export function astNodeDepth(root: RegularExpressionAst, nodeId: string): number | null {
  const visit = (node: RegularExpressionAst, depth: number): number | null => {
    if (node.id === nodeId) return depth;
    for (const child of astChildren(node)) { const result = visit(child, depth + 1); if (result !== null) return result; }
    return null;
  };
  return visit(root, 0);
}

export function astSubtreeSize(root: RegularExpressionAst): number {
  return 1 + astChildren(root).reduce((size, child) => size + astSubtreeSize(child), 0);
}

export function validateAst(root: RegularExpressionAst): AstValidation {
  const errors: AstValidationIssue[] = [];
  const seen = new Set<string>();
  const visit = (node: RegularExpressionAst) => {
    if (!node.id.trim()) errors.push({ code: "INVALID_ID", message: "Every AST node needs an ID.", nodeId: node.id });
    else if (seen.has(node.id)) errors.push({ code: "DUPLICATE_NODE_ID", message: `AST node ID "${node.id}" is duplicated.`, nodeId: node.id });
    seen.add(node.id);
    if (!Number.isInteger(node.span.start) || !Number.isInteger(node.span.end) || node.span.start < 0 || node.span.end < node.span.start) errors.push({ code: "INVALID_SPAN", message: "AST node source spans must be non-negative ordered integers.", nodeId: node.id, span: node.span });
    if (node.type === "literal" && !node.value) errors.push({ code: "INVALID_LITERAL", message: "Literal nodes need a symbol.", nodeId: node.id, span: node.span });
    astChildren(node).forEach((child) => { if (!child) errors.push({ code: "INVALID_CHILD", message: "Operator nodes need valid operands.", nodeId: node.id }); else visit(child); });
  };
  visit(root);
  return { valid: errors.length === 0, errors };
}

export function createRegularExpressionModel(source: string, root: RegularExpressionAst): RegularExpressionModel {
  return { source, root: cloneAst(root), alphabet: collectAlphabet(root) };
}

export function cloneAst(root: RegularExpressionAst): RegularExpressionAst { return structuredClone(root); }

export function astStructurallyEqual(left: RegularExpressionAst, right: RegularExpressionAst, includeIds = false): boolean {
  if (left.type !== right.type) return false;
  if (includeIds && left.id !== right.id) return false;
  if (left.type === "literal" && right.type === "literal") return left.value === right.value;
  const leftChildren = astChildren(left); const rightChildren = astChildren(right);
  return leftChildren.length === rightChildren.length && leftChildren.every((child, index) => astStructurallyEqual(child, rightChildren[index], includeIds));
}

export function serializeAst(root: RegularExpressionAst): string { return JSON.stringify({ version: 1, root }); }

export function deserializeAst(serialized: string): AstDeserializeResult {
  try {
    const value = JSON.parse(serialized) as { version?: unknown; root?: RegularExpressionAst };
    if (value.version !== 1 || !value.root) return { ok: false, errors: [{ code: "INVALID_CHILD", message: "Serialized AST must contain version 1 and a root node." }] };
    const validation = validateAst(value.root);
    return validation.valid ? { ok: true, value: cloneAst(value.root) } : { ok: false, errors: validation.errors };
  } catch {
    return { ok: false, errors: [{ code: "INVALID_CHILD", message: "Serialized AST is not valid JSON." }] };
  }
}
