/** Renderer-independent context-free grammar data. */
export type GrammarProduction = {
  id: string;
  lhs: string;
  rhs: string[];
};

export type ContextFreeGrammar = {
  variables: string[];
  terminals: string[];
  startSymbol: string;
  productions: GrammarProduction[];
};

export type DerivationStep = {
  id: string;
  stepNumber?: number;
  symbols: string[];
  appliedProductionId?: string;
  highlightedRange?: { start: number; end: number };
  activeTreeNodeId?: string;
  highlightedTreeNodeIds?: string[];
  highlightedTreeEdges?: Array<{ from: string; to: string }>;
  inputIndex?: number;
};

export type ParseTreeNode = {
  id: string;
  label: string;
  parentId?: string;
  productionId?: string;
  children?: string[];
  status?: "normal" | "selected" | "highlighted" | "active";
};

export type ParseTreeData = { rootId: string; nodes: ParseTreeNode[] };

export type GrammarTransformationStep = {
  id: string;
  label: string;
  before: ContextFreeGrammar;
  after: ContextFreeGrammar;
  highlightedProductionIds?: string[];
};

/** Persisted Puck data; supplied derivations and trees are authored, never inferred. */
export type ContextFreeGrammarBlockProps = {
  grammarId?: string;
  grammar: ContextFreeGrammar;
  input: string;
  derivationSteps?: DerivationStep[];
  parseTree?: ParseTreeData | null;
  showGrammar?: boolean;
  showDerivation?: boolean;
  showParseTree?: boolean;
  showInput?: boolean;
};

/** Transient visual state for a future controller; never written to Puck. */
export type ContextFreeGrammarViewState = {
  playbackId?: string;
  grammar?: ContextFreeGrammar;
  input?: string;
  inputSymbols?: string[];
  currentDerivationStep?: number;
  selectedProductionId?: string | null;
  highlightedProductionIds?: string[];
  selectedParseTreeNodeId?: string | null;
  highlightedParseTreeNodeIds?: string[];
  highlightedSubtreeRootIds?: string[];
  activeParseTreeNodeId?: string | null;
  highlightedParseTreeEdges?: Array<{ from: string; to: string }>;
  currentInputIndex?: number;
  highlightedInputIndex?: number;
  result?: "unknown" | "accepted" | "rejected";
  derivationSteps?: DerivationStep[];
  parseTree?: ParseTreeData | null;
};
