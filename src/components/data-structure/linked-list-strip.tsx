"use client";

import { cn } from "@/lib/utils";

type LinkedListStripProps = {
  nodes: Array<{ value: string }>;
  activeIndex?: number;
  visitedIndices?: number[];
  traversalTarget?: number;
  className?: string;
};

const EMPTY_VISITED_INDICES: number[] = [];

export function LinkedListStrip({
  nodes,
  activeIndex,
  visitedIndices = EMPTY_VISITED_INDICES,
  traversalTarget,
  className,
}: LinkedListStripProps) {
  const isTraversing = traversalTarget !== undefined;

  return (
    <div className={cn("flex min-w-max items-center gap-3", className)}>
      {nodes.map((node, index) => {
        const isActive = activeIndex === index;
        const isVisited = visitedIndices.includes(index) || isActive;
        const isTargetHit = isTraversing && isVisited && index === traversalTarget;
        const isTraversalMiss = isTraversing && isVisited && !isTargetHit;
        const isPlainActive = !isTraversing && isActive;

        return (
          <div key={`${node.value}-${index}`} className="flex items-center gap-3">
            <div
              className={cn(
                "grid h-16 min-w-24 place-items-center rounded-xl border border-border bg-background px-4 text-lg font-semibold text-foreground shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition",
                isTraversalMiss && "border-border bg-muted/50 opacity-40",
                isTargetHit &&
                  "border-emerald-500/60 bg-emerald-500 text-white",
                isPlainActive &&
                  "border-primary/50 bg-primary text-primary-foreground",
              )}
            >
              {node.value}
            </div>
            {index < nodes.length - 1 ? (
              <span className="text-lg text-muted-foreground">{"->"}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
