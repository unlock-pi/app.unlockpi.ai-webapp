"use client";

import type { ParseTreeData } from "./types";
import { TreeDiagram } from "@unlockpi/ui";

export function ParseTree({ tree, selectedNodeId, highlightedNodeIds, highlightedSubtreeRootIds, activeNodeId, highlightedEdges, visibleNodeIds, enteringNodeIds, animationKey, fillHeight }: {
  visibleNodeIds?: string[];
  enteringNodeIds?: string[];
  animationKey?: string;
  fillHeight?: boolean;
  tree: ParseTreeData | null | undefined;
  selectedNodeId?: string | null;
  highlightedNodeIds?: string[];
  highlightedSubtreeRootIds?: string[];
  activeNodeId?: string | null;
  highlightedEdges?: Array<{ from: string; to: string }>;
}) {
  return <TreeDiagram tree={tree} visibleNodeIds={visibleNodeIds} enteringNodeIds={enteringNodeIds} animationKey={animationKey} fillHeight={fillHeight} compact maxWidth={780} ariaLabel="Context-free grammar parse tree" emptyLabel="No parse tree supplied" selectedNodeId={selectedNodeId} highlightedNodeIds={highlightedNodeIds} highlightedSubtreeRootIds={highlightedSubtreeRootIds} activeNodeId={activeNodeId} highlightedEdges={highlightedEdges} />;
}
