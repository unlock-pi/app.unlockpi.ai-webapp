"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export type TreeDiagramNode = {
  id: string;
  label: string;
  children?: string[];
  shape?: "round" | "square";
  status?: "normal" | "selected" | "highlighted" | "active";
  description?: string;
};

export type TreeDiagramData = { rootId: string; nodes: TreeDiagramNode[] };

type TreeDiagramProps = {
  tree: TreeDiagramData | null | undefined;
  selectedNodeId?: string | null;
  highlightedNodeIds?: string[];
  highlightedSubtreeRootIds?: string[];
  activeNodeId?: string | null;
  highlightedEdges?: Array<{ from: string; to: string }>;
  className?: string;
  ariaLabel?: string;
  emptyLabel?: string;
  compact?: boolean;
  maxWidth?: number;
  visibleNodeIds?: string[];
  enteringNodeIds?: string[];
  animationKey?: string;
  fillHeight?: boolean;
};

const HORIZONTAL_GAP = 92;
const VERTICAL_GAP = 68;
const PADDING_X = 56;
const PADDING_Y = 24;
const NODE_HEIGHT = 42;

function layoutTree(tree: TreeDiagramData, compact: boolean) {
  const byId = new Map(tree.nodes.map((node) => [node.id, node]));
  const positions = new Map<string, { node: TreeDiagramNode; x: number; y: number; width: number }>();
  const visiting = new Set<string>();
  let nextLeaf = 0;
  let maxDepth = 0;
  const place = (id: string, depth: number): number => {
    const existing = positions.get(id);
    if (existing) return existing.x;
    const node = byId.get(id);
    if (!node || visiting.has(id)) return PADDING_X + nextLeaf * HORIZONTAL_GAP;
    visiting.add(id);
    maxDepth = Math.max(maxDepth, depth);
    const childXs = (node.children ?? []).filter((childId) => byId.has(childId)).map((childId) => place(childId, depth + 1));
    const x = childXs.length ? (childXs[0] + childXs[childXs.length - 1]) / 2 : PADDING_X + nextLeaf++ * HORIZONTAL_GAP;
    positions.set(id, {
      node,
      x,
      y: PADDING_Y + NODE_HEIGHT / 2 + depth * VERTICAL_GAP,
      width: node.shape === "round" ? 46 : Math.max(46, Math.min(92, node.label.length * 8 + 26)),
    });
    visiting.delete(id);
    return x;
  };
  place(tree.rootId, 0);
  for (const node of tree.nodes) if (!positions.has(node.id)) place(node.id, maxDepth + 1);
  const placed = [...positions.values()];
  const left = placed.length ? Math.min(...placed.map((point) => point.x - point.width / 2)) : 0;
  const right = placed.length ? Math.max(...placed.map((point) => point.x + point.width / 2)) : 0;
  const width = Math.max(compact ? 300 : 480, right - left + PADDING_X * 2);
  const offset = width / 2 - (left + right) / 2;
  for (const point of placed) point.x += offset;
  return { positions, width, height: Math.max(150, PADDING_Y * 2 + NODE_HEIGHT + maxDepth * VERTICAL_GAP) };
}

function subtreeIds(tree: TreeDiagramData, roots: string[]) {
  const byId = new Map(tree.nodes.map((node) => [node.id, node]));
  const included = new Set<string>();
  const visit = (id: string) => {
    if (included.has(id)) return;
    included.add(id);
    byId.get(id)?.children?.forEach(visit);
  };
  roots.forEach(visit);
  return included;
}

/** Domain-neutral, n-ary tree visualization. Callers supply every node and edge. */
export function TreeDiagram({ tree, selectedNodeId, highlightedNodeIds = [], highlightedSubtreeRootIds = [], activeNodeId, highlightedEdges = [], className, ariaLabel = "Tree diagram", emptyLabel = "No tree has been supplied yet.", compact = false, maxWidth = 520, visibleNodeIds, enteringNodeIds = [], animationKey, fillHeight = false }: TreeDiagramProps) {
  const layout = useMemo(() => tree ? layoutTree(tree, compact) : null, [tree, compact]);
  const subtree = useMemo(() => tree ? subtreeIds(tree, highlightedSubtreeRootIds) : new Set<string>(), [tree, highlightedSubtreeRootIds]);
  if (!tree || !layout || !tree.nodes.length) return <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  const visible = visibleNodeIds ? new Set(visibleNodeIds) : null;
  return <div className={cn("w-full min-w-0 overflow-x-auto", fillHeight && "h-full min-h-0", compact ? "py-3" : "px-3 py-2 sm:px-5", className)}>
    <svg className={cn("mx-auto block h-auto max-w-none", !compact && "min-w-[480px]")} style={{ height: fillHeight ? "100%" : undefined, aspectRatio: `${layout.width} / ${layout.height}`, width: fillHeight ? "100%" : compact ? `min(100%, ${maxWidth}px)` : `min(100%, ${layout.width}px)` }} viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label={ariaLabel}>
      {tree.nodes.flatMap((node) => (node.children ?? []).map((childId) => {
        const from = layout.positions.get(node.id);
        const to = layout.positions.get(childId);
        if (!from || !to || (visible && (!visible.has(node.id) || !visible.has(childId)))) return null;
        const emphasized = activeNodeId === node.id || selectedNodeId === node.id || subtree.has(node.id) || highlightedEdges.some((edge) => edge.from === node.id && edge.to === childId);
        return <path key={`${animationKey ?? ""}:${node.id}-${childId}`} pathLength={1} style={enteringNodeIds.includes(childId) ? { animation: "cfg-branch-grow 900ms ease-out both" } : undefined} data-tree-edge={`${node.id}-${childId}`} d={`M ${from.x} ${from.y + NODE_HEIGHT / 2} L ${to.x} ${to.y - NODE_HEIGHT / 2}`} fill="none" stroke="currentColor" className={cn("text-border transition-colors", emphasized && "text-primary/55")} strokeLinecap="round" strokeWidth={emphasized ? 2.5 : 2} />;
      }))}
      {tree.nodes.map((node) => {
        const point = layout.positions.get(node.id);
        if (!point || (visible && !visible.has(node.id))) return null;
        const highlighted = highlightedNodeIds.includes(node.id) || subtree.has(node.id) || node.status === "highlighted";
        const selected = selectedNodeId === node.id || node.status === "selected";
        const active = activeNodeId === node.id || node.status === "active";
        const round = node.shape === "round";
        return <g key={`${animationKey ?? ""}:${node.id}`} style={enteringNodeIds.includes(node.id) ? { animation: "cfg-node-reveal 600ms ease-out 600ms both" } : undefined} data-tree-node={node.id} data-syntax-node={node.id}>
          <title>{node.description ?? node.label}</title>
          <rect x={point.x - point.width / 2} y={point.y - NODE_HEIGHT / 2} width={point.width} height={NODE_HEIGHT} rx={round ? NODE_HEIGHT / 2 : 11} className={cn("fill-background stroke-border transition-colors", round && "fill-muted/45", highlighted && "fill-warning/15 stroke-warning", selected && "fill-primary/15 stroke-primary", active && "fill-primary stroke-primary")} strokeWidth={active || selected ? 2.5 : 1.5} />
          <text x={point.x} y={point.y + (round ? 6 : 5)} textAnchor="middle" className={cn("fill-foreground font-semibold", round ? "text-[18px]" : "font-mono text-[13px]", active && "fill-primary-foreground")}>{node.label}</text>
        </g>;
      })}
    </svg>
  </div>;
}
