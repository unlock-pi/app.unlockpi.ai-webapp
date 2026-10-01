"use client";

import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

type StackValue = string | number;

export type StackStripProps = {
  /**
   * Values from BOTTOM of stack to TOP. `data[0]` is the bottom (drawn
   * deepest in the bucket); the LAST element is the top and gets the "Top"
   * badge. Pushing appends to the end of this array; popping removes the
   * last element — never `data[0]`.
   *
   * @example
   * ```tsx
   * // Bottom -> top: "8" was pushed first, "0" is on top right now.
   * <StackStrip data={["8", "5", "0"]} />
   * ```
   */
  data: StackValue[];
  name?: string;
  activeIndex?: number;
  visitedIndices?: number[];
  traversalTarget?: number;
  showIndex?: boolean;
  /**
   * When true, the bucket renders a fixed number of slots (see `stackSize`).
   * Empty slots stay visible as ghost placeholders so the size of the
   * container never changes — a push slots into the next empty position, a
   * pop leaves the slot empty. When false (dynamic), the bucket grows and
   * shrinks with `data.length`.
   *
   * This prop only controls the VISUAL. To actually enforce the capacity
   * (block a push once full, trim on resize), use the pure helpers in
   * `stack-model.ts` — `canPushStack`, `pushStack`, `clampStackToCapacity` —
   * on your own state before passing the result down as `data`. See
   * `src/app/dashboard/(temp)/temp/page.tsx` for the reference wiring.
   *
   * @example
   * ```tsx
   * <StackStrip data={data} isFixed stackSize={5} />
   * ```
   */
  isFixed?: boolean;
  /** Only used when `isFixed`. Total slots the bucket holds. Defaults to 5. */
  stackSize?: number;
  className?: string;
};

const EMPTY_VISITED_INDICES: number[] = [];

// Visual metaphor:
//   PUSH — item flies in from the left, drops onto the top of the stack with
//          a small settling spring. Reads as "a thing lands on the pile".
//   POP  — top item lifts up, drifts right, fades out. Reads as "a thing is
//          taken off and carried away".
// Springs are tuned soft enough to feel light, stiff enough to feel
// responsive on rapid presses.
const PUSH_ANIM = {
  initial: { x: -120, opacity: 0, scale: 0.92 },
  animate: { x: 0, opacity: 1, scale: 1 },
  transition: { type: "spring" as const, stiffness: 340, damping: 26, mass: 0.7 },
};

const POP_ANIM = {
  exit: { x: 56, y: -20, opacity: 0, scale: 0.9 },
  transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const },
};

export function StackStrip({
  data,
  name,
  activeIndex,
  visitedIndices = EMPTY_VISITED_INDICES,
  traversalTarget,
  showIndex = true,
  className,
  isFixed = false,
  stackSize = 5,
}: StackStripProps) {
  const topIndex = data.length - 1;
  const isTraversing = traversalTarget !== undefined;

  // In fixed mode, visible data is clamped to the bucket's capacity so an
  // over-push from the parent doesn't spill out of the walls. Parent should
  // guard pushes; this is a safety net.
  const visibleData = isFixed ? data.slice(0, stackSize) : data;
  const emptySlots =
    isFixed && stackSize > visibleData.length
      ? Array.from({ length: stackSize - visibleData.length })
      : [];

  return (
    <div
      className={cn(
        "flex w-full items-end justify-center gap-4 pt-20",
        className,
      )}
    >
      {name ? (
        <div className="grid min-w-10 justify-items-end self-end pb-3 text-2xl font-semibold tracking-tight text-foreground">
          <span className="leading-none">{name} =</span>
        </div>
      ) : null}

      <section className="flex items-end gap-2">
        {/*
          Bucket. Three walls + open top. `flex-col-reverse` makes the FIRST
          child sit at the bottom, which is what "bottom of stack = data[0]"
          means visually. Empty slots come AFTER the data in JSX, so they
          appear ABOVE the filled cells — the waiting positions.
        */}
        <div
          className={cn(
            "flex flex-col-reverse gap-2 rounded-b-2xl border-x-2 border-b-2 border-dashed border-foreground/25 p-3",
            // Reserve a subtle inner surface so the walls stand out from the
            // page in both themes.
            "bg-muted/40",
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {visibleData.map((item, index) => {
              const isActive = activeIndex === index;
              const isVisited = visitedIndices.includes(index) || isActive;
              const isTargetHit =
                isTraversing && isVisited && index === traversalTarget;
              const isTraversalMiss = isTraversing && isVisited && !isTargetHit;
              const isPlainActive = !isTraversing && isActive;

              return (
                <motion.div
                  // Key by index so push/pop map cleanly to enter/exit on the
                  // last slot only — the items below don't get treated as
                  // "different items" between renders.
                  key={index}
                  layout
                  initial={PUSH_ANIM.initial}
                  animate={PUSH_ANIM.animate}
                  exit={POP_ANIM.exit}
                  transition={PUSH_ANIM.transition}
                  className="flex items-center gap-3"
                >
                  <div
                    className={cn(
                      "flex h-12 w-28 items-center justify-center rounded-sm border border-border bg-[#4C4C4C] text-lg tracking-tight text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition-colors",
                      isTraversalMiss && "border-border bg-muted/50 opacity-40",
                      isTargetHit &&
                        "border-emerald-500/60 bg-emerald-500 text-white",
                      isPlainActive &&
                        "border-primary/50 bg-primary text-primary-foreground",
                    )}
                  >
                    {item}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/*
            Ghost slots: only rendered in fixed mode. Same size as filled
            cells so the bucket keeps its total height whether it's full or
            empty. Dashed outline so it reads as "waiting slot" instead of
            "empty box".
          */}
          {emptySlots.map((_, i) => (
            <div
              key={`slot-${i}`}
              className="h-12 w-28 rounded-sm border border-dashed border-foreground/15"
            />
          ))}

          {/* Empty-state message only in dynamic mode. */}
          {!isFixed && visibleData.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">
              Empty stack
            </p>
          ) : null}
        </div>

        {/*
          Sidebar: index + Top badge for each data item. Kept in the same
          flex-col-reverse rhythm so it lines up with the bucket vertically.
          Uses the same layout animation so it stays in sync when items slide
          in/out.
        */}
        {/*
          Sidebar. Matches the bucket's ordering: data first in JSX (renders
          at the BOTTOM because of flex-col-reverse), empty spacers after
          (renders ABOVE the data). That way an index row lines up with its
          matching cell in the bucket, and blank spacers line up with blank
          slots.
        */}
        <div className="flex flex-col-reverse gap-2 py-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {visibleData.map((_, index) => {
              const isTop = index === topIndex;
              return (
                <motion.div
                  key={index}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                  className="flex h-12 items-center gap-2"
                >
                  {showIndex ? (
                    <>
                      <span className="w-6 text-sm font-medium tabular-nums text-muted-foreground">
                        {index}
                      </span>
                      {isTop ? <Badge>Top</Badge> : null}
                    </>
                  ) : null}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {emptySlots.map((_, i) => (
            <div key={`empty-side-${i}`} className="h-12" />
          ))}
        </div>
      </section>
    </div>
  );
}
