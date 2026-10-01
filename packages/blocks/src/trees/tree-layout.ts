import { treeNode } from "./model";
import type { TreeModel } from "./types";

export type TreePoint = { x: number; y: number };
export type TreeLayout = {
  width: number;
  height: number;
  positions: Map<string, TreePoint>;
};

const COLUMN_GAP = 112;
const ROW_GAP = 116;
const PADDING_X = 86;
const PADDING_Y = 78;

/** Inorder slots preserve a visible left/right relationship even in skewed trees. */
export function layoutBinaryTree(tree: TreeModel): TreeLayout {
  const positions = new Map<string, TreePoint>();
  let slot = 0;
  let maxDepth = 0;
  const seen = new Set<string>();
  const place = (id: string | null, depth: number) => {
    if (!id || seen.has(id)) return;
    const node = treeNode(tree, id);
    if (!node) return;
    seen.add(id);
    place(node.leftChildId, depth + 1);
    positions.set(id, { x: PADDING_X + slot * COLUMN_GAP, y: PADDING_Y + depth * ROW_GAP });
    slot++;
    maxDepth = Math.max(maxDepth, depth);
    place(node.rightChildId, depth + 1);
  };
  place(tree.rootId, 0);
  const contentWidth = Math.max(0, (slot - 1) * COLUMN_GAP) + PADDING_X * 2;
  const width = Math.max(700, contentWidth);
  const offset = (width - contentWidth) / 2;
  for (const point of positions.values()) point.x += offset;
  return {
    width,
    height: Math.max(390, PADDING_Y * 2 + maxDepth * ROW_GAP),
    positions,
  };
}
