"use client";

import { motion, useReducedMotion } from "motion/react";

import { TREE_NODE_RADIUS } from "@/components/trees/tree-node";
import type { TreePoint } from "@/components/trees/tree-layout";
import type { ChildSide } from "@/components/trees/types";

type TreeEdgeViewProps = {
  parentId: string;
  childId: string;
  side: ChildSide;
  from: TreePoint;
  to: TreePoint;
  active: boolean;
  stepKey: number;
};

function edgePath(from: TreePoint, to: TreePoint) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const start = { x: from.x + dx / length * TREE_NODE_RADIUS, y: from.y + dy / length * TREE_NODE_RADIUS };
  const end = { x: to.x - dx / length * TREE_NODE_RADIUS, y: to.y - dy / length * TREE_NODE_RADIUS };
  return "M " + start.x + " " + start.y + " L " + end.x + " " + end.y;
}

export function TreeEdgeView({ parentId, childId, side, from, to, active, stepKey }: TreeEdgeViewProps) {
  const reduceMotion = useReducedMotion();
  const d = edgePath(from, to);
  return (
    <motion.g data-tree-edge={parentId + "-" + childId} data-tree-side={side} className="pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.45 }}>
      <motion.path
        d={d}
        initial={{ opacity: 0, pathLength: 0 }}
        animate={{ d, opacity: 1, pathLength: 1 }}
        exit={{ opacity: 0, pathLength: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
        fill="none"
        stroke="var(--foreground)"
        strokeOpacity={0.72}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      {active ? (
        <motion.path
          key={stepKey}
          data-tree-edge-trace=""
          d={d}
          fill="none"
          stroke="var(--tree-accent)"
          strokeWidth={4.5}
          strokeLinecap="round"
          initial={{ opacity: 0.3, pathLength: 0 }}
          animate={{ opacity: 1, pathLength: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.95, ease: [0.22, 1, 0.36, 1] }}
        />
      ) : null}
    </motion.g>
  );
}
