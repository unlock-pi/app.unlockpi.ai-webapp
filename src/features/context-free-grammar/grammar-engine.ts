import type {
  ContextFreeGrammar,
  DerivationStep,
  GrammarProduction,
  ParseTreeData,
  ParseTreeNode,
} from "@/features/context-free-grammar/model";

export type GrammarIssue = {
  code: "MISSING_START" | "DUPLICATE_SYMBOL" | "SYMBOL_COLLISION" | "INVALID_SYMBOL" |
    "DUPLICATE_PRODUCTION" | "INVALID_LHS" | "UNDEFINED_SYMBOL" | "EXPLICIT_EPSILON";
  message: string;
  productionId?: string;
  symbol?: string;
};
export type GrammarValidation = { valid: boolean; errors: GrammarIssue[]; warnings: GrammarIssue[] };
export type GrammarError = {
  code: "INVALID_GRAMMAR" | "GRAMMAR_NOT_FOUND" | "DUPLICATE_ID" | "PRODUCTION_NOT_FOUND" |
    "INVALID_OPERATION" | "INVALID_INPUT" | "STRING_NOT_DERIVABLE" | "DERIVATION_NOT_FOUND" |
    "STEP_OUT_OF_RANGE" | "TREE_NODE_NOT_FOUND";
  message: string;
  details?: Record<string, unknown>;
};
export type GrammarResult<T> = { success: true; value: T } | { success: false; error: GrammarError };

export type GrammarMutation =
  | { operation: "add_production"; production: GrammarProduction }
  | { operation: "update_production"; productionId: string; lhs?: string; rhs?: string[] }
  | { operation: "remove_production"; productionId: string }
  | { operation: "set_start_symbol"; symbol: string }
  | { operation: "add_variable" | "remove_variable" | "add_terminal" | "remove_terminal"; symbol: string };

export type GrammarParseTreeNode = ParseTreeNode & {
  parentId?: string;
  productionId?: string;
};
export type GrammarParseTree = ParseTreeData & { nodes: GrammarParseTreeNode[] };
export type GrammarDerivation = {
  input: string;
  inputSymbols: string[];
  steps: DerivationStep[];
  parseTree: GrammarParseTree;
  status: "ready";
};

const fail = (code: GrammarError["code"], message: string, details?: Record<string, unknown>): GrammarResult<never> =>
  ({ success: false, error: { code, message, details } });
const succeed = <T>(value: T): GrammarResult<T> => ({ success: true, value });

export function validateGrammar(grammar: ContextFreeGrammar): GrammarValidation {
  const errors: GrammarIssue[] = [];
  const warnings: GrammarIssue[] = [];
  const variables = grammar.variables ?? [];
  const terminals = grammar.terminals ?? [];
  const variableSet = new Set(variables);
  const terminalSet = new Set(terminals);
  if (!grammar.startSymbol || !variableSet.has(grammar.startSymbol)) {
    errors.push({ code: "MISSING_START", message: "Start symbol must be a declared variable.", symbol: grammar.startSymbol });
  }
  for (const [kind, symbols] of [["variable", variables], ["terminal", terminals]] as const) {
    const seen = new Set<string>();
    for (const symbol of symbols) {
      if (!symbol || symbol.trim() !== symbol || /\s/.test(symbol) || symbol === "ε") {
        errors.push({ code: "INVALID_SYMBOL", message: kind + " must be a nonempty symbol without whitespace or ε.", symbol });
      }
      if (seen.has(symbol)) errors.push({ code: "DUPLICATE_SYMBOL", message: kind + " " + symbol + " is duplicated.", symbol });
      seen.add(symbol);
    }
  }
  for (const symbol of variables) {
    if (terminalSet.has(symbol)) errors.push({ code: "SYMBOL_COLLISION", message: symbol + " cannot be both a variable and terminal.", symbol });
  }
  const ids = new Set<string>();
  for (const production of grammar.productions ?? []) {
    if (!production.id?.trim() || ids.has(production.id)) {
      errors.push({ code: "DUPLICATE_PRODUCTION", message: "Production IDs must be unique and nonempty.", productionId: production.id });
    }
    ids.add(production.id);
    if (!variableSet.has(production.lhs)) {
      errors.push({ code: "INVALID_LHS", message: "Production " + production.id + " must have a declared variable on the left.", productionId: production.id, symbol: production.lhs });
    }
    for (const symbol of production.rhs ?? []) {
      if (symbol === "ε") {
        errors.push({ code: "EXPLICIT_EPSILON", message: "Represent ε with an empty right-hand side.", productionId: production.id, symbol });
      } else if (!variableSet.has(symbol) && !terminalSet.has(symbol)) {
        errors.push({ code: "UNDEFINED_SYMBOL", message: "Production " + production.id + " references undefined symbol " + symbol + ".", productionId: production.id, symbol });
      }
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function modifyGrammar(grammar: ContextFreeGrammar, change: GrammarMutation): GrammarResult<ContextFreeGrammar> {
  const next = structuredClone(grammar);
  const index = "productionId" in change
    ? next.productions.findIndex((production) => production.id === change.productionId)
    : -1;
  switch (change.operation) {
    case "add_production":
      if (next.productions.some((production) => production.id === change.production.id))
        return fail("DUPLICATE_ID", "Production " + change.production.id + " already exists.");
      next.productions.push(structuredClone(change.production));
      break;
    case "update_production":
      if (index < 0) return fail("PRODUCTION_NOT_FOUND", "Production " + change.productionId + " does not exist.");
      next.productions[index] = {
        ...next.productions[index],
        ...(change.lhs === undefined ? {} : { lhs: change.lhs }),
        ...(change.rhs === undefined ? {} : { rhs: [...change.rhs] }),
      };
      break;
    case "remove_production":
      if (index < 0) return fail("PRODUCTION_NOT_FOUND", "Production " + change.productionId + " does not exist.");
      next.productions.splice(index, 1);
      break;
    case "set_start_symbol":
      next.startSymbol = change.symbol;
      break;
    case "add_variable":
    case "add_terminal": {
      const list = change.operation === "add_variable" ? next.variables : next.terminals;
      if (list.includes(change.symbol)) return fail("DUPLICATE_ID", "Symbol " + change.symbol + " already exists.");
      list.push(change.symbol);
      break;
    }
    case "remove_variable":
    case "remove_terminal": {
      const list = change.operation === "remove_variable" ? next.variables : next.terminals;
      if (!list.includes(change.symbol)) return fail("INVALID_OPERATION", "Symbol " + change.symbol + " does not exist.");
      const newList = list.filter((symbol) => symbol !== change.symbol);
      if (change.operation === "remove_variable") next.variables = newList;
      else next.terminals = newList;
      break;
    }
  }
  const validation = validateGrammar(next);
  if (!validation.valid) return fail("INVALID_GRAMMAR", validation.errors[0].message, { validation });
  return succeed(next);
}

/** Input is codepoint-based for single-character terminals; whitespace separates larger terminals. */
export function tokenizeGrammarInput(grammar: ContextFreeGrammar, input: string): GrammarResult<string[]> {
  const trimmed = input.trim();
  if (!trimmed) return succeed([]);
  const symbols = grammar.terminals.every((symbol) => [...symbol].length === 1)
    ? [...trimmed]
    : /\s/.test(trimmed)
      ? trimmed.split(/\s+/).filter(Boolean)
      : [trimmed];
  const unknown = symbols.find((symbol) => !grammar.terminals.includes(symbol));
  if (unknown) return fail("INVALID_INPUT", "Input symbol " + unknown + " is not a declared terminal.", { symbol: unknown });
  return succeed(symbols);
}

type WitnessChild = { symbol: string; start: number; end: number; terminal: boolean };
type Witness = { production: GrammarProduction; children: WitnessChild[] };
const chartKey = (symbol: string, start: number, end: number) => JSON.stringify([symbol, start, end]);

/** Fixed-point span recognition supports left recursion, nullable rules, and unit cycles. */
export function deriveString(grammar: ContextFreeGrammar, input: string): GrammarResult<GrammarDerivation> {
  const validation = validateGrammar(grammar);
  if (!validation.valid) return fail("INVALID_GRAMMAR", validation.errors[0].message, { validation });
  const tokenized = tokenizeGrammarInput(grammar, input);
  if (!tokenized.success) return tokenized;
  const tokens = tokenized.value;
  const n = tokens.length;
  const variableSet = new Set(grammar.variables);
  const chart = new Map<string, Witness>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const production of grammar.productions) {
      for (let start = 0; start <= n; start++) {
        const explore = (part: number, position: number, children: WitnessChild[]) => {
          if (part === production.rhs.length) {
            const key = chartKey(production.lhs, start, position);
            if (!chart.has(key)) {
              chart.set(key, { production, children });
              changed = true;
            }
            return;
          }
          const symbol = production.rhs[part];
          if (variableSet.has(symbol)) {
            for (let end = position; end <= n; end++) {
              if (!chart.has(chartKey(symbol, position, end))) continue;
              explore(part + 1, end, [...children, { symbol, start: position, end, terminal: false }]);
            }
          } else if (tokens[position] === symbol) {
            explore(part + 1, position + 1, [...children, { symbol, start: position, end: position + 1, terminal: true }]);
          }
        };
        explore(0, start, []);
      }
    }
  }
  if (!chart.has(chartKey(grammar.startSymbol, 0, n))) {
    return fail("STRING_NOT_DERIVABLE", "The target string cannot be derived using the current grammar.", { input });
  }

  const nodes: GrammarParseTreeNode[] = [];
  let nextId = 0;
  const build = (symbol: string, start: number, end: number, parentId?: string, terminal = false): string => {
    const id = "n" + nextId++;
    const witness = terminal ? undefined : chart.get(chartKey(symbol, start, end));
    const node: GrammarParseTreeNode = {
      id, label: symbol, parentId, children: [], productionId: witness?.production.id,
    };
    nodes.push(node);
    if (witness) {
      if (!witness.children.length) {
        const epsilonId = "n" + nextId++;
        nodes.push({ id: epsilonId, label: "ε", parentId: id, children: [] });
        node.children = [epsilonId];
      } else {
        node.children = witness.children.map((child) => build(child.symbol, child.start, child.end, id, child.terminal));
      }
    }
    return id;
  };
  const rootId = build(grammar.startSymbol, 0, n);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let frontier = [rootId];
  const steps: DerivationStep[] = [{
    id: "d0", stepNumber: 0, symbols: [grammar.startSymbol], activeTreeNodeId: rootId,
  }];
  let stepNumber = 0;
  while (true) {
    const position = frontier.findIndex((id) => Boolean(byId.get(id)?.productionId));
    if (position < 0) break;
    const node = byId.get(frontier[position])!;
    const children = (node.children ?? []).filter((id) => byId.get(id)?.label !== "ε");
    frontier = [...frontier.slice(0, position), ...children, ...frontier.slice(position + 1)];
    stepNumber++;
    steps.push({
      id: "d" + stepNumber,
      stepNumber,
      symbols: frontier.map((id) => byId.get(id)!.label),
      appliedProductionId: node.productionId,
      highlightedRange: children.length ? { start: position, end: position + children.length } : undefined,
      activeTreeNodeId: node.id,
      highlightedTreeEdges: (node.children ?? []).map((childId) => ({ from: node.id, to: childId })),
      inputIndex: undefined,
    });
  }
  return succeed({ input, inputSymbols: tokens, steps, parseTree: { rootId, nodes }, status: "ready" });
}

export function stepDerivation(currentStep: number, derivation: GrammarDerivation): GrammarResult<number> {
  return succeed(Math.min(currentStep + 1, derivation.steps.length - 1));
}
export function showDerivationStep(step: number, derivation: GrammarDerivation): GrammarResult<number> {
  if (!Number.isInteger(step) || step < 0 || step >= derivation.steps.length) return fail("STEP_OUT_OF_RANGE", "Derivation step " + step + " does not exist.");
  return succeed(step);
}
export function resetDerivation(): number { return 0; }
