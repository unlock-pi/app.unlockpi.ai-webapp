/** Renderer-independent CFG data contracts. */
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
