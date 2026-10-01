import type { ContextFreeGrammarBlockProps, GrammarProduction } from "@/components/context-free-grammar/types";

function distinctSymbols(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function reconcileProductions(productions: GrammarProduction[]) {
  const used = new Set<string>();
  return productions.map((production, index) => {
    let id = production.id?.trim() || "p" + index;
    if (used.has(id)) {
      let suffix = index;
      while (used.has("p" + suffix)) suffix++;
      id = "p" + suffix;
    }
    used.add(id);
    return {
      id,
      lhs: production.lhs?.trim() ?? "",
      rhs: (production.rhs ?? []).map((symbol) => symbol.trim()).filter(Boolean),
    };
  });
}

/** Reconciles serializable authoring data without synthesizing derivations or trees. */
export function reconcileContextFreeGrammarProps(
  props: ContextFreeGrammarBlockProps,
  previous?: ContextFreeGrammarBlockProps | null,
): ContextFreeGrammarBlockProps {
  const grammar = {
    variables: distinctSymbols(props.grammar?.variables ?? []),
    terminals: distinctSymbols(props.grammar?.terminals ?? []),
    startSymbol: props.grammar?.startSymbol?.trim() ?? "",
    productions: reconcileProductions(props.grammar?.productions ?? []),
  };
  const grammarChanged = Boolean(previous && JSON.stringify(previous.grammar) !== JSON.stringify(props.grammar));
  const validProductionIds = new Set(grammar.productions.map((production) => production.id));
  const usedSteps = new Set<string>();
  const staleDerivation = grammarChanged && JSON.stringify(props.derivationSteps) === JSON.stringify(previous?.derivationSteps);
  const derivationSteps = staleDerivation ? [] : (props.derivationSteps ?? []).filter((step) => {
    if (!step.id?.trim() || usedSteps.has(step.id)) return false;
    usedSteps.add(step.id);
    return !step.appliedProductionId || validProductionIds.has(step.appliedProductionId);
  }).map((step) => ({ ...step, symbols: [...step.symbols] }));
  const staleTree = grammarChanged && JSON.stringify(props.parseTree) === JSON.stringify(previous?.parseTree);
  const suppliedTree = staleTree ? null : props.parseTree;
  const parseTree = suppliedTree?.nodes?.some((node) => node.id === suppliedTree.rootId)
    ? suppliedTree
    : null;
  return {
    ...props,
    grammar,
    input: props.input ?? "",
    derivationSteps,
    parseTree,
    showGrammar: props.showGrammar ?? true,
    showDerivation: props.showDerivation ?? true,
    showParseTree: props.showParseTree ?? true,
    showInput: props.showInput ?? true,
  };
}
