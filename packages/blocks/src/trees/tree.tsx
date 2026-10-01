"use client";

import { AnimatePresence } from "motion/react";
import { useMemo } from "react";

import { TreeEdgeView } from "./tree-edge";
import { layoutBinaryTree } from "./tree-layout";
import { TreeNodeView } from "./tree-node";
import type {
  TreeExecutionState,
  TreeModel,
  TreeNode,
  TreeNodeVisualState,
  TreeViewState,
} from "./types";

type TreeRendererProps = {
  tree: TreeModel;
  view: TreeViewState;
  execution?: TreeExecutionState | null;
  onSelect: (id: string | null) => void;
  className?: string;
};

function visualState(
  node: TreeNode,
  view: TreeViewState,
  execution?: TreeExecutionState | null,
): TreeNodeVisualState {
  const step = execution?.step;
  const inEmphasis = step?.highlightedNodeIds?.includes(node.id);
  if (step?.type === "mark_deleting" && step.currentNodeId === node.id) return "deleting";
  if (step?.type === "detect_imbalance" && step.currentNodeId === node.id) return "invalid";
  if ((step?.type === "violation" || (step?.type === "complete" && execution?.result?.valid === false)) && inEmphasis) return "invalid";
  if (step?.type === "found" && step.currentNodeId === node.id) return "found";
  if (execution?.status === "complete" && execution.operation === "bst_search" && execution.result?.foundNodeId === node.id) return "found";
  if (step?.type === "insert_node" && step.currentNodeId === node.id) return "inserting";
  if (step?.currentNodeId === node.id) return "current";
  if (view.selectedNodeId === node.id) return "selected";
  if (inEmphasis) return "path";
  if (view.highlightedNodeIds.includes(node.id)) return "highlighted";
  if (step?.visitedNodeIds?.includes(node.id)) return "visited";
  return "normal";
}

/** One renderer for binary trees, BSTs, and AVL rotations. */
export function TreeRenderer({ tree, view, execution, onSelect, className }: TreeRendererProps) {
  const layout = useMemo(() => layoutBinaryTree(tree), [tree]);
  const step = execution?.step;
  return (
    <div className={"tree-canvas relative h-[34rem] w-full overflow-auto rounded-xl border border-border bg-card " + (className ?? "")}>
      {!tree.rootId ? (
        <div className="grid h-full place-items-center text-sm text-muted-foreground">
          Create a root to begin.
        </div>
      ) : (
        <svg
          role="img"
          aria-label={tree.kind === "avl" ? "AVL tree diagram" : tree.kind === "heap" ? "Binary heap diagram" : "Binary tree diagram"}
          className="block h-full min-w-full select-none"
          style={{ width: layout.width }}
          viewBox={"0 0 " + layout.width + " " + layout.height}
          preserveAspectRatio="xMidYMid meet"
          onClick={() => onSelect(null)}
        >
          <AnimatePresence initial={false}>
            {tree.nodes.flatMap((node) => ([
              { side: "left" as const, childId: node.leftChildId },
              { side: "right" as const, childId: node.rightChildId },
            ]).map(({ side, childId }) => {
              if (!childId) return null;
              const from = layout.positions.get(node.id);
              const to = layout.positions.get(childId);
              if (!from || !to) return null;
              const active = step?.activeEdge?.parentId === node.id && step.activeEdge.childId === childId;
              return (
                <TreeEdgeView
                  key={node.id + "-" + childId}
                  parentId={node.id}
                  childId={childId}
                  side={side}
                  from={from}
                  to={to}
                  active={active}
                  stepKey={execution?.currentStep ?? 0}
                />
              );
            }))}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {tree.nodes.map((node) => {
              const point = layout.positions.get(node.id);
              if (!point) return null;
              return (
                <TreeNodeView
                  key={node.id}
                  node={step?.displayValues?.[node.id] === undefined ? node : { ...node, value: step.displayValues[node.id] }}
                  point={point}
                  visualState={visualState(node, view, execution)}
                  onSelect={onSelect}
                />
              );
            })}
          </AnimatePresence>
        </svg>
      )}
    </div>
  );
}
