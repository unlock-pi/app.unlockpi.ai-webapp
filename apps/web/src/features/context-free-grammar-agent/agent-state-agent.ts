import type { ContextFreeGrammar, ContextFreeGrammarViewState } from "@/components/context-free-grammar/types";
import type { GrammarDerivation } from "@/features/context-free-grammar/grammar-engine";

export type GrammarRecord = {
  grammarId: string;
  grammar: ContextFreeGrammar;
  input: string;
  version: number;
  derivation: GrammarDerivation | null;
  currentStep: number;
  treeVisible: boolean;
  view: ContextFreeGrammarViewState;
};

export type ContextFreeGrammarAgentState = {
  activeCanvasId: string | null;
  selectedGrammarId: string | null;
  grammarOrder: string[];
  grammars: Record<string, GrammarRecord>;
};

export function createInitialContextFreeGrammarAgentState(canvasId: string | null = null): ContextFreeGrammarAgentState {
  return { activeCanvasId: canvasId, selectedGrammarId: null, grammarOrder: [], grammars: {} };
}

export function createGrammarRecord(grammarId: string, grammar: ContextFreeGrammar, input = ""): GrammarRecord {
  return {
    grammarId, grammar: structuredClone(grammar), input, version: 1,
    derivation: null, currentStep: 0, treeVisible: false,
    view: {
      grammar: structuredClone(grammar), input, inputSymbols: [...input],
      currentDerivationStep: 0, derivationSteps: [], parseTree: null,
      currentInputIndex: 0, result: "unknown",
      highlightedProductionIds: [], highlightedParseTreeNodeIds: [],
    },
  };
}

export function replaceGrammar(record: GrammarRecord, grammar: ContextFreeGrammar): GrammarRecord {
  return { ...createGrammarRecord(record.grammarId, grammar, record.input), version: record.version + 1 };
}

export function replaceInput(record: GrammarRecord, input: string): GrammarRecord {
  return { ...createGrammarRecord(record.grammarId, record.grammar, input), version: record.version };
}

export function withDerivation(record: GrammarRecord, derivation: GrammarDerivation): GrammarRecord {
  const next = structuredClone(record);
  next.derivation = derivation;
  next.currentStep = 0;
  next.treeVisible = true;
  next.view = {
    ...next.view,
    input: derivation.input,
    inputSymbols: derivation.inputSymbols,
    derivationSteps: derivation.steps,
    parseTree: derivation.parseTree,
    currentDerivationStep: 0,
    selectedProductionId: null,
    highlightedProductionIds: [],
    activeParseTreeNodeId: derivation.steps[0]?.activeTreeNodeId ?? null,
    highlightedParseTreeEdges: [],
    currentInputIndex: 0,
    result: "unknown",
  };
  return next;
}

export function atDerivationStep(record: GrammarRecord, index: number): GrammarRecord {
  const next = structuredClone(record);
  const step = next.derivation?.steps[index];
  if (!step) return next;
  next.currentStep = index;
  next.view.currentDerivationStep = index;
  next.view.selectedProductionId = step.appliedProductionId ?? null;
  next.view.highlightedProductionIds = step.appliedProductionId ? [step.appliedProductionId] : [];
  next.view.activeParseTreeNodeId = step.activeTreeNodeId ?? null;
  next.view.highlightedParseTreeNodeIds = step.highlightedTreeNodeIds ?? [];
  next.view.highlightedParseTreeEdges = step.highlightedTreeEdges ?? [];
  next.view.currentInputIndex = step.inputIndex ?? 0;
  next.view.result = index === next.derivation!.steps.length - 1 ? "accepted" : "unknown";
  return next;
}

export function selectedGrammar(state: ContextFreeGrammarAgentState): GrammarRecord | null {
  const id = state.selectedGrammarId;
  return id ? state.grammars[id] ?? null : null;
}

export function describeContextFreeGrammarAgentState(state: ContextFreeGrammarAgentState) {
  const selected = selectedGrammar(state);
  return selected
    ? `Selected ${selected.grammarId}, version ${selected.version}; input "${selected.input}"; derivation ${selected.derivation ? selected.currentStep + 1 + "/" + selected.derivation.steps.length : "not generated"}.`
    : "No CFG selected.";
}
