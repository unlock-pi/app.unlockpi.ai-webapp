"use client";

import { cn } from "@/lib/utils";

type QueueValue = string | number;

export type QueueStripProps = {
  data: QueueValue[];
  name?: string;
  activeIndex?: number;
  visitedIndices?: number[];
  traversalTarget?: number;
  showLabels?: boolean;
  className?: string;
};

const EMPTY_VISITED_INDICES: number[] = [];

export function QueueStrip({
  data,
  name,
  activeIndex,
  visitedIndices = EMPTY_VISITED_INDICES,
  traversalTarget,
  showLabels = true,
  className,
}: QueueStripProps) {
  const backIndex = data.length - 1;
  const isTraversing = traversalTarget !== undefined;

  return (
    <div className={cn("flex w-full items-center justify-center gap-4", className)}>
      {name ? (
        <div className="grid min-w-10 justify-items-end self-center text-2xl font-semibold tracking-tight text-foreground">
          <span className="leading-none">{name} =</span>
        </div>
      ) : null}

      <div className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-muted/10 p-3">
        {data.length ? (
          data.map((item, index) => {
            const isFront = index === 0;
            const isBack = index === backIndex;
            const isActive = activeIndex === index;
            const isVisited = visitedIndices.includes(index) || isActive;
            const isTargetHit = isTraversing && isVisited && index === traversalTarget;
            const isTraversalMiss = isTraversing && isVisited && !isTargetHit;
            const isPlainActive = !isTraversing && isActive;

            return (
              <div key={`${item}-${index}`} className="grid justify-items-center gap-2">
                {showLabels ? (
                  <span className="grid h-4 place-items-center">
                    {isFront ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                        Front
                      </span>
                    ) : isBack ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                        Back
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">
                        {index}
                      </span>
                    )}
                  </span>
                ) : null}
                <div
                  className={cn(
                    "flex h-12 w-16 items-center justify-center rounded-xl border border-border bg-background text-lg font-semibold tracking-tight text-foreground shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition",
                    isTraversalMiss && "border-border bg-muted/50 opacity-40",
                    isTargetHit &&
                      "border-emerald-500/60 bg-emerald-500 text-white",
                    isPlainActive &&
                      "border-primary/50 bg-primary text-primary-foreground",
                  )}
                >
                  {item}
                </div>
              </div>
            );
          })
        ) : (
          <p className="px-6 py-8 text-sm text-muted-foreground">Empty queue</p>
        )}
      </div>
    </div>
  );
}
