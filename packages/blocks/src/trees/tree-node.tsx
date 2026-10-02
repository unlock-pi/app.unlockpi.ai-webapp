"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { TreePoint } from "./tree-layout";
import type { TreeNode, TreeNodeVisualState } from "./types";

export const TREE_NODE_RADIUS = 31;

type TreeNodeViewProps = {
  node: TreeNode;
  point: TreePoint;
  visualState: TreeNodeVisualState;
  onSelect: (id: string) => void;
};

function appearance(state: TreeNodeVisualState) {
  switch (state) {
    case "current":
    case "inserting":
      return { fill: "var(--tree-accent)", stroke: "var(--tree-accent)", text: "var(--tree-accent-foreground)" };
    case "selected":
    case "highlighted":
    case "path":
      return { fill: "var(--tree-accent-soft)", stroke: "var(--tree-accent)", text: "var(--foreground)" };
    case "found":
      return { fill: "var(--success)", stroke: "var(--success)", text: "var(--success-foreground)" };
    case "deleting":
    case "invalid":
      return { fill: "var(--destructive)", stroke: "var(--destructive)", text: "var(--destructive-foreground)" };
    case "visited":
      return { fill: "var(--card)", stroke: "var(--muted-foreground)", text: "var(--foreground)" };
    default:
      return { fill: "var(--card)", stroke: "var(--foreground)", text: "var(--foreground)" };
  }
}

export function TreeNodeView({ node, point, visualState, onSelect }: TreeNodeViewProps) {
  const reduceMotion = useReducedMotion();
  const color = appearance(visualState);
  const duration = reduceMotion ? 0 : 0.65;
  return (
    <motion.g
      data-tree-node={node.id}
      data-tree-state={visualState}
      role="button"
      tabIndex={0}
      aria-label={"Node " + node.value}
      className="cursor-pointer outline-none"
      initial={{ x: point.x, y: point.y, opacity: 0, scale: 0.72 }}
      animate={{
        x: point.x, y: point.y,
        opacity: visualState === "deleting" ? 0.58 : 1,
        scale: visualState === "deleting" ? 0.9 : 1,
      }}
      exit={{ opacity: 0, scale: 0.68 }}
      transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
      onClick={(event) => { event.stopPropagation(); onSelect(node.id); }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(node.id);
        }
      }}
    >
      <circle r={TREE_NODE_RADIUS + 10} fill="transparent" />
      <circle
        r={TREE_NODE_RADIUS}
        fill={color.fill}
        stroke={color.stroke}
        strokeWidth={visualState === "normal" ? 2 : 3}
        className="transition-[fill,stroke,stroke-width] duration-500 motion-reduce:transition-none"
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.text
          key={node.value}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color.text}
          fontSize={18}
          fontWeight={700}
          className="pointer-events-none [font-family:var(--font-canvas-heading),var(--font-system),sans-serif]"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: reduceMotion ? 0 : 0.35 }}
        >
          {node.value}
        </motion.text>
      </AnimatePresence>
    </motion.g>
  );
}
