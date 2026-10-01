import type {
  ContextFreeGrammar, DerivationStep, ParseTreeData,
} from "@/features/context-free-grammar/model";
export type {
  ContextFreeGrammar, GrammarProduction, DerivationStep, ParseTreeNode, ParseTreeData,
} from "@/features/context-free-grammar/model";

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
