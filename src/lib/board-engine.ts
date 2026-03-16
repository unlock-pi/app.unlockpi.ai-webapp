// ── Board Engine ──────────────────────────────────────────────────────
// Pure functions — no React. Applies operations to a BoardDocument.
// Every operation returns a new document with version bumped by 1.

import type {
  BoardDocument,
  BoardOperation,
  Block,
  ParagraphBlock,
  Line,
} from "@/types/board";

// ── Factory ──────────────────────────────────────────────────────────

export function createEmptyBoard(): BoardDocument {
  return { id: "board-1", version: 0, blocks: [] };
}

// ── Main Dispatcher ──────────────────────────────────────────────────

export function applyOperation(
  doc: BoardDocument,
  op: BoardOperation
): BoardDocument {
  switch (op.type) {
    case "updateLine":
      return applyUpdateLine(doc, op.blockId, op.lineId, op.newText);
    case "insertLineAfter":
      return applyInsertLineAfter(doc, op.blockId, op.afterLineId, op.newLine);
    case "deleteLine":
      return applyDeleteLine(doc, op.blockId, op.lineId);
    case "addBlock":
      return applyAddBlock(doc, op.block, op.afterBlockId);
    case "deleteBlock":
      return applyDeleteBlock(doc, op.blockId);
    case "highlightLine":
      return applyHighlightLine(doc, op.blockId, op.lineId, op.highlightType);
    case "setBoard":
      return { ...op.document, version: doc.version + 1 };
    default:
      return doc;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function findBlockIndex(blocks: Block[], blockId: string): number {
  return blocks.findIndex((b) => b.id === blockId);
}

function findLineIndex(lines: Line[], lineId: string): number {
  return lines.findIndex((l) => l.id === lineId);
}

function bumpVersion(doc: BoardDocument, newBlocks: Block[]): BoardDocument {
  return { ...doc, version: doc.version + 1, blocks: newBlocks };
}

// ── Operation Implementations ────────────────────────────────────────

function applyUpdateLine(
  doc: BoardDocument,
  blockId: string,
  lineId: string,
  newText: string
): BoardDocument {
  const bi = findBlockIndex(doc.blocks, blockId);
  if (bi === -1) return doc;

  const block = doc.blocks[bi];
  if (block.type !== "paragraph") return doc;

  const li = findLineIndex(block.lines, lineId);
  if (li === -1) return doc;

  const newLines = [...block.lines];
  newLines[li] = { ...newLines[li], text: newText };

  const newBlocks = [...doc.blocks];
  newBlocks[bi] = { ...block, lines: newLines };

  return bumpVersion(doc, newBlocks);
}

function applyInsertLineAfter(
  doc: BoardDocument,
  blockId: string,
  afterLineId: string,
  newLine: Line
): BoardDocument {
  const bi = findBlockIndex(doc.blocks, blockId);
  if (bi === -1) return doc;

  const block = doc.blocks[bi];
  if (block.type !== "paragraph") return doc;

  const li = findLineIndex(block.lines, afterLineId);
  if (li === -1) return doc;

  const newLines = [...block.lines];
  newLines.splice(li + 1, 0, newLine);

  const newBlocks = [...doc.blocks];
  newBlocks[bi] = { ...block, lines: newLines };

  return bumpVersion(doc, newBlocks);
}

function applyDeleteLine(
  doc: BoardDocument,
  blockId: string,
  lineId: string
): BoardDocument {
  const bi = findBlockIndex(doc.blocks, blockId);
  if (bi === -1) return doc;

  const block = doc.blocks[bi];
  if (block.type !== "paragraph") return doc;

  const li = findLineIndex(block.lines, lineId);
  if (li === -1) return doc;

  const newLines = block.lines.filter((l) => l.id !== lineId);
  const newBlocks = [...doc.blocks];
  newBlocks[bi] = { ...block, lines: newLines };

  return bumpVersion(doc, newBlocks);
}

function applyAddBlock(
  doc: BoardDocument,
  block: Block,
  afterBlockId?: string
): BoardDocument {
  const newBlocks = [...doc.blocks];

  if (afterBlockId) {
    const bi = findBlockIndex(doc.blocks, afterBlockId);
    if (bi === -1) {
      newBlocks.push(block);
    } else {
      newBlocks.splice(bi + 1, 0, block);
    }
  } else {
    newBlocks.push(block);
  }

  return bumpVersion(doc, newBlocks);
}

function applyDeleteBlock(
  doc: BoardDocument,
  blockId: string
): BoardDocument {
  const bi = findBlockIndex(doc.blocks, blockId);
  if (bi === -1) return doc;

  const newBlocks = doc.blocks.filter((b) => b.id !== blockId);
  return bumpVersion(doc, newBlocks);
}

function applyHighlightLine(
  doc: BoardDocument,
  blockId: string,
  lineId: string,
  highlightType: string
): BoardDocument {
  const bi = findBlockIndex(doc.blocks, blockId);
  if (bi === -1) return doc;

  const block = doc.blocks[bi];
  if (block.type !== "paragraph") return doc;

  const li = findLineIndex(block.lines, lineId);
  if (li === -1) return doc;

  const newLines = [...block.lines];
  newLines[li] = {
    ...newLines[li],
    highlight: highlightType as ParagraphBlock["lines"][number]["highlight"],
  };

  const newBlocks = [...doc.blocks];
  newBlocks[bi] = { ...block, lines: newLines };

  return bumpVersion(doc, newBlocks);
}
