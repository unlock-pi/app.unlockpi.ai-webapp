import type { ContextFreeGrammar } from "@/features/context-free-grammar/model";
import type { PDA } from "@/features/pda/model-agent";
export type CFGToPDAStep = { id: string; label: string; pda: PDA };
export function cfgToPDA(grammar: ContextFreeGrammar, id = "cfg-pda"): CFGToPDAStep[] {
  const base: PDA = { id, inputAlphabet: grammar.terminals, stackAlphabet: [...new Set([...grammar.variables, ...grammar.terminals])], startState: "q", acceptStates: [], initialStackSymbol: grammar.startSymbol, acceptanceMode: "empty_stack", states: [{ id: "q", label: "q", initial: true }], transitions: [] };
  const expansions = grammar.productions.map((production) => ({ id: `expand-${production.id}`, from: "q", to: "q", inputSymbol: "ε", stackTop: production.lhs, operation: "replace" as const, pushSymbols: [...production.rhs].reverse() }));
  const matches = grammar.terminals.map((terminal) => ({ id: `match-${terminal}`, from: "q", to: "q", inputSymbol: terminal, stackTop: terminal, operation: "pop" as const }));
  return [ { id: "initial", label: "Initialize stack with the CFG start variable", pda: base }, ...expansions.map((_, index) => ({ id: `production-${index}`, label: `Add production ${grammar.productions[index].lhs} → ${grammar.productions[index].rhs.join("") || "ε"}`, pda: { ...base, transitions: expansions.slice(0, index + 1) } })), { id: "terminals", label: "Add terminal-matching pop transitions", pda: { ...base, transitions: [...expansions, ...matches] } } ];
}
