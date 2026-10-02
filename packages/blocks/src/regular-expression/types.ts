import type {
  Automaton,
  AutomatonExecution,
} from "@unlockpi/blocks/automata";

export type RegularExpressionNodeKind =
  | "literal"
  | "union"
  | "concatenation"
  | "kleene-star"
  | "epsilon"
  | "empty-set"
  | "group";
export type RegularExpressionVisualStatus =
  "normal" | "selected" | "highlighted" | "active";

/** Ordered authored pieces of an expression; this is display data, never parser output. */
export type RegularExpressionExpressionSegment = {
  id: string;
  text: string;
  kind: RegularExpressionNodeKind;
  status?: RegularExpressionVisualStatus;
};

/** A supplied AST-shaped data structure for the visualizer; no AST is constructed here. */
export type RegularExpressionSyntaxTreeNode = {
  id: string;
  label: string;
  kind: RegularExpressionNodeKind;
  children?: string[];
  status?: RegularExpressionVisualStatus;
};

export type RegularExpressionSyntaxTree = {
  rootId: string;
  nodes: RegularExpressionSyntaxTreeNode[];
};

export type RegularExpressionConstructionStep = {
  id: string;
  step?: number;
  operation?:
    | "literal"
    | "epsilon"
    | "empty-set"
    | "concatenation"
    | "union"
    | "kleene-star";
  astNodeId?: string;
  title: string;
  description: string;
  createdStateIds?: string[];
  createdTransitionIds?: string[];
  highlightedExpressionNodeIds?: string[];
  highlightedSyntaxTreeNodeIds?: string[];
  highlightedStateIds?: string[];
  highlightedTransitionIds?: string[];
};

export type RegularExpressionDisplayMode =
  "expression" | "tree" | "construction";
export type RegularExpressionExecutionStatus =
  "idle" | "running" | "paused" | "accepted" | "rejected" | "error";

/** Transient visual data an eventual RE agent can set without knowing React internals. */
export type RegularExpressionViewState = {
  expression?: string;
  displayMode?: RegularExpressionDisplayMode;
  expressionSegments?: RegularExpressionExpressionSegment[];
  selectedExpressionNodeId?: string | null;
  highlightedExpressionNodeIds?: string[];
  syntaxTree?: RegularExpressionSyntaxTree | null;
  selectedSyntaxTreeNodeId?: string | null;
  highlightedSyntaxTreeNodeIds?: string[];
  highlightedSyntaxTreeSubtreeIds?: string[];
  activeSyntaxTreeNodeId?: string | null;
  constructionSteps?: RegularExpressionConstructionStep[];
  currentConstructionStep?: number;
  input?: string;
  inputSymbols?: string[];
  currentInputIndex?: number;
  highlightedInputIndex?: number;
  executionStatus?: RegularExpressionExecutionStatus;
  result?: "unknown" | "accepted" | "rejected";
  showGeneratedAutomaton?: boolean;
  generatedAutomaton?: Automaton | null;
  generatedAutomatonExecution?: AutomatonExecution | null;
  sourceAutomaton?: Automaton | null;
  sourceAutomatonExecution?: AutomatonExecution | null;
  generatedDfa?: Automaton | null;
  generatedDfaExecution?: AutomatonExecution | null;
  conversionPlaybackActive?: boolean;
  currentConversionStep?: number;
  conversionStepCount?: number;
  highlightedSourceStateIds?: string[];
  highlightedTargetStateIds?: string[];
  highlightedConversionTransitionIds?: string[];
};

export type RegularExpressionBlockProps = {
  expression: string;
  input: string;
  displayMode?: RegularExpressionDisplayMode;
  expressionSegments?: RegularExpressionExpressionSegment[];
  syntaxTree?: RegularExpressionSyntaxTree | null;
  constructionSteps?: RegularExpressionConstructionStep[];
  showSyntaxTree?: boolean;
  showConstruction?: boolean;
  showInput?: boolean;
  showExecutionControls?: boolean;
};
