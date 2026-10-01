"use client";

import { AnimatePresence, motion } from "motion/react";

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

// Same springs ArrayStrip and StackStrip use, so all four visualisers settle
// with identical weight.
const CELL_SPRING = {
  type: "spring" as const,
  stiffness: 240,
  damping: 22,
  mass: 0.8,
};
const VALUE_SPRING = {
  type: "spring" as const,
  stiffness: 200,
  damping: 18,
  mass: 0.5,
};

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
    <div
      className={cn("flex w-full items-center justify-center gap-4", className)}
    >
      {name ? (
        <div className="grid min-w-10 justify-items-end self-center text-2xl font-semibold tracking-tight text-foreground">
          <span className="leading-none">{name} =</span>
        </div>
      ) : null}

      {/*
        Open-ended tube rather than a closed box: a queue is entered at the
        back and left at the front, so the left and right edges stay open
        while the top and bottom rails carry the same dashed treatment the
        array container uses.
      */}
      
      <motion.div
        layout
        transition={CELL_SPRING}
        className="flex items-center gap-1 border-b3-2 border-dashed border-foreground/25 bg-muted/40 px-3 py-2"
      >
        {data.length ? (
          <AnimatePresence initial={false} mode="popLayout">
            {data.map((item, index) => {
              const isFront = index === 0;
              const isBack = index === backIndex;
              const isActive = activeIndex === index;
              const isVisited = visitedIndices.includes(index) || isActive;
              const isTargetHit =
                isTraversing && isVisited && index === traversalTarget;
              const isTraversalMiss = isTraversing && isVisited && !isTargetHit;
              const isPlainActive = !isTraversing && isActive;

              return (
                <motion.div
                  key={index}
                  layout
                  // Enqueue arrives from the back (right), dequeue leaves
                  // through the front (left) — the motion states the FIFO
                  // rule without needing the labels to say it.
                  initial={{
                    opacity: 0,
                    x: 36,
                    scale: 0.7,
                    filter: "blur(4px)",
                  }}
                  animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -36, scale: 0.7, filter: "blur(4px)" }}
                  transition={CELL_SPRING}
                  className={cn("grid justify-items-center gap-2", isFront && "pl-5", isBack && "mr-1")}
                >
                  {showLabels ? (
                    <span className="grid h-4 place-items-center mb-4 ">
                      {isFront || isBack ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                          {isFront ? "Front" : "Back"}
                        </span>
                      ) : (
                        <span className="text-sm font-medium tabular-nums text-muted-foreground">
                          {index}
                        </span>
                      )}
                    </span>
                  ) : null}
                  <div className={cn("h-1 w-full border-t-2 border-dashed border-foreground/25 bg-muted/40",  isFront && "pl-5", isBack && "mr-5")} />
                  <motion.div
                    layout
                    transition={CELL_SPRING}
                    className={cn(
                      "relative flex  h-[3.25rem] w-[3.25rem] items-center justify-center rounded-sm border border-border bg-[#4C4C4C] text-base tracking-tight text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition-colors duration-300 sm:h-14 sm:w-14 sm:text-lg md:h-16 md:w-16 md:text-xl",
                      isTraversalMiss &&
                        "border-border bg-muted/50 text-muted-foreground opacity-40",
                      isTargetHit &&
                        "border-emerald-500/60 bg-emerald-500 text-white",
                      isPlainActive &&
                        "border-primary/50 bg-primary text-primary-foreground",
                    )}
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={String(item)}
                        initial={{
                          opacity: 0,
                          scale: 0.7,
                          filter: "blur(2px)",
                        }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 0.7, filter: "blur(2px)" }}
                        transition={VALUE_SPRING}
                        className="pointer-events-none select-none"
                      >
                        {item}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
                  <div className={cn("h-1 w-full border-t-2 border-dashed border-foreground/25 bg-muted/40",  isFront && "pl-5", isBack && "pr-5")} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        ) : (
          <p className="px-6 py-8 text-sm text-muted-foreground">Empty queue</p>
        )}
      </motion.div>
    </div>
  );
}
