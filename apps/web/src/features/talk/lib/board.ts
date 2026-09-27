// ── Board Document Model ──────────────────────────────────────────────
// Structured JSON document tree: BoardDocument → Block[] → Line[]
// MDX components are the rendering layer; this is the data format.

export type HighlightType =
  | "important"
  | "definition"
  | "warning"
  | "exam"
  | "focus"
  | "note";

export interface Line {
  id: string;
  text: string;
  highlight?: HighlightType;
}

// ── Block Types ──────────────────────────────────────────────────────

export interface ParagraphBlock {
  id: string;
  type: "paragraph";
  lines: Line[];
}

export interface FormulaBlock {
  id: string;
  type: "formula";
  formula: string;
}

export interface DiagramBlock {
  id: string;
  type: "diagram";
  diagramType: "mermaid";
  content: string;
}

export type Block = ParagraphBlock | FormulaBlock | DiagramBlock;

// ── Board Document ───────────────────────────────────────────────────

export interface BoardDocument {
  id: string;
  version: number;
  blocks: Block[];
}

// ── Operations ───────────────────────────────────────────────────────

export interface UpdateLineOp {
  type: "updateLine";
  blockId: string;
  lineId: string;
  newText: string;
}

export interface InsertLineAfterOp {
  type: "insertLineAfter";
  blockId: string;
  afterLineId: string;
  newLine: Line;
}

export interface DeleteLineOp {
  type: "deleteLine";
  blockId: string;
  lineId: string;
}

export interface AddBlockOp {
  type: "addBlock";
  block: Block;
  afterBlockId?: string;
}

export interface DeleteBlockOp {
  type: "deleteBlock";
  blockId: string;
}

export interface HighlightLineOp {
  type: "highlightLine";
  blockId: string;
  lineId: string;
  highlightType: HighlightType;
}

export interface SetBoardOp {
  type: "setBoard";
  document: BoardDocument;
}

export type BoardOperation =
  | UpdateLineOp
  | InsertLineAfterOp
  | DeleteLineOp
  | AddBlockOp
  | DeleteBlockOp
  | HighlightLineOp
  | SetBoardOp;
