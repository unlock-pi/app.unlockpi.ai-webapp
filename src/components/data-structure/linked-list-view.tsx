"use client";

import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

type LinkedListViewProps = {
  nodes: Array<{ value: string }>;
  activeIndex?: number;
  visitedIndices?: number[];
  traversalTarget?: number;
  className?: string;
};

const EMPTY_VISITED_INDICES: number[] = [];

/** Gap between one node's pointer box and the next node — the arrow's visible run. */
const LINK_GAP_PX = 28;
/** Width of the "next" pointer box on the right of each node. */
const POINTER_BOX_PX = 32;

/**
 * The next-pointer: a dot at the centre of the pointer box, a line, and an
 * arrowhead whose tip lands exactly on the next node's edge.
 *
 * Drawn inline rather than as an <img>: the old 56x24 file was squeezed into a
 * 48x48 box and nudged with negative margins, so the dot sat off-centre and
 * the next node covered the arrowhead. Here the geometry comes from the same
 * two constants as the layout, and `currentColor` keeps it visible in both
 * themes (the file was hard-coded black).
 */
function PointerArrow() {
  const length = POINTER_BOX_PX / 2 + LINK_GAP_PX;
  const mid = 6;
  return (
    <svg
      aria-hidden="true"
      width={length}
      height={mid * 2}
      viewBox={`0 0 ${length} ${mid * 2}`}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-y-1/2 overflow-visible text-foreground"
      fill="none"
    >
      <circle cx={0} cy={mid} r={3} fill="currentColor" />
      <path
        d={`M0 ${mid} H${length - 1}`}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d={`M${length - 6} ${mid - 4} L${length - 1} ${mid} L${length - 6} ${mid + 4}`}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Matches ArrayView / StackView / QueueView.
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

export function LinkedListView({
  nodes,
  activeIndex,
  visitedIndices = EMPTY_VISITED_INDICES,
  traversalTarget,
  className,
}: LinkedListViewProps) {
  const isTraversing = traversalTarget !== undefined;

  return (
    <motion.div
      layout
      transition={CELL_SPRING}
      className={cn(
        // No enclosing rail here, unlike the array/queue: a linked list has
        // no contiguous block of memory to draw a box around — the pointers
        // ARE the structure. Nodes get the same plate treatment though.
        "flex min-w-max items-center gap-0",
        className,
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {nodes.map((node, index) => {
          const isActive = activeIndex === index;
          const isVisited = visitedIndices.includes(index) || isActive;
          const isTargetHit =
            isTraversing && isVisited && index === traversalTarget;
          const isTraversalMiss = isTraversing && isVisited && !isTargetHit;
          const isPlainActive = !isTraversing && isActive;
          const isLast = index === nodes.length - 1;

          return (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
              transition={CELL_SPRING}
              className="flex items-center"
            >
              <section className="flex items-center">
                <motion.div
                  layout
                  transition={CELL_SPRING}
                  className={cn(
                    // Same plate as the other visualisers, just wider — a node
                    // holds a label rather than a single value.
                    "relative grid h-10 min-w-24 place-items-center rounded-l-sm border border-border bg-[#4C4C4C] px-4 text-base tracking-tight text-white transition-colors duration-300 sm:h-12",
                    isTraversalMiss &&
                      "border-border bg-muted/50 text-muted-foreground opacity-40",
                    isTargetHit &&
                      "border-emerald-500/60 bg-emerald-500 text-white",
                    isPlainActive &&
                      "border-primary/50 bg-primary text-primary-foreground",
                    isLast && "rounded-r-sm",
                  )}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={node.value}
                      initial={{ opacity: 0, scale: 0.7, filter: "blur(2px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.7, filter: "blur(2px)" }}
                      transition={VALUE_SPRING}
                      className="pointer-events-none select-none whitespace-nowrap"
                    >
                      {node.value}
                    </motion.span>
                  </AnimatePresence>
                </motion.div>

                {/* The "next" field. Same height as the plate so the two read
                    as one node; the arrow starts from its centre. The tail has
                    none — that null pointer is the thing that ends the list. */}
                {isLast ? null : (
                  <div
                    className="relative h-10 shrink-0 rounded-r-sm border border-l-0 border-border bg-card sm:h-12"
                    style={{ width: POINTER_BOX_PX }}
                  >
                    <PointerArrow />
                  </div>
                )}
              </section>

              {/* Room for the arrow's run, so its tip meets the next node. */}
              {isLast ? null : (
                <span aria-hidden="true" className="shrink-0" style={{ width: LINK_GAP_PX }} />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
