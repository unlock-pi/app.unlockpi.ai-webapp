"use client";
import type { RegularExpressionNodeKind, RegularExpressionSyntaxTree } from "./types";
import { TreeDiagram, cn } from "@unlockpi/ui";

type SyntaxTreeProps = {
  tree: RegularExpressionSyntaxTree | null | undefined;
  selectedNodeId?: string | null;
  highlightedNodeIds?: string[];
  highlightedSubtreeRootIds?: string[];
  activeNodeId?: string | null;
  className?: string;
  compact?: boolean;
};

const NODE_KIND_LABELS: Record<RegularExpressionNodeKind, string> = {
  literal: "Literal", union: "Union", concatenation: "Concatenation",
  "kleene-star": "Kleene star", epsilon: "Epsilon", "empty-set": "Empty set", group: "Group",
};

/** RE-specific labels and presentation atop the shared n-ary tree renderer. */
export function SyntaxTree({ tree, selectedNodeId, highlightedNodeIds, highlightedSubtreeRootIds, activeNodeId, className, compact = false }: SyntaxTreeProps) {
  const visualTree = tree ? {
    rootId: tree.rootId,
    nodes: tree.nodes.map((node) => ({
      ...node,
      shape: (["union", "concatenation", "kleene-star"].includes(node.kind) ? "round" : "square") as "round" | "square",
      description: NODE_KIND_LABELS[node.kind] + ": " + node.label,
    })),
  } : null;
  return <section className={cn(!compact && "overflow-hidden rounded-xl border border-border/70 bg-muted/10", className)} aria-label="Syntax tree">
    {!compact && tree ? <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
      <div><h3 className="text-sm font-semibold text-foreground">Abstract syntax tree</h3><p className="text-xs text-muted-foreground">Operators bind the expression from the leaves upward.</p></div>
      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{tree.nodes.length} nodes</span>
    </header> : null}
    <TreeDiagram tree={visualTree} selectedNodeId={selectedNodeId} highlightedNodeIds={highlightedNodeIds} highlightedSubtreeRootIds={highlightedSubtreeRootIds} activeNodeId={activeNodeId} compact={compact} fillHeight={compact} maxWidth={compact ? 920 : 520} className={compact ? "[&_[data-tree-edge]]:text-slate-500 [&_[data-tree-node]_rect]:stroke-slate-400 [&_[data-tree-node]_text]:fill-slate-100" : undefined} ariaLabel="Regular expression abstract syntax tree" emptyLabel="No syntax tree has been supplied yet." />
    {!compact && tree ? <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
      <span><strong className="font-mono text-foreground">|</strong> union</span><span><strong className="font-mono text-foreground">·</strong> concatenate</span><span><strong className="font-mono text-foreground">*</strong> repeat</span>
    </footer> : null}
  </section>;
}
