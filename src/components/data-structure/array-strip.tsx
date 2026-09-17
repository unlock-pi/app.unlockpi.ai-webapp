"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ArrayValue = string | number;

export type ArrayStripProps = {
  data: ArrayValue[];
  disabledElements?: number[];
  visitedIndices?: number[];
  traversalTarget?: number;
  name?: string;
  nameHint?: string;
  accessExpression?: string;
  showIndex?: boolean;
  activeIndex?: number;
  dimElements?: boolean;
  dimIndices?: boolean;
  highlightElements?: boolean;
  highlightIndices?: boolean;
  className?: string;
  /**
   * Several cells under examination at once — the pair a sort is comparing,
   * or a highlighted range. `activeIndex` stays for the single-cell case.
   */
  activeIndices?: number[];
  /** Cells proven to be in their final sorted position. */
  settledIndices?: number[];
  /** The cell that answers the question: a search hit, an inserted slot. */
  foundIndex?: number;
  /** A labelled pointer under one cell, e.g. the quicksort pivot. */
  marker?: { index: number; label: string };
  /**
   * A value lifted OUT of the array — insertion sort's held element, merge
   * sort's buffered value. Shown as a chip above the strip so the duplicate
   * that in-place shifting creates reads as a copy rather than a glitch.
   */
  held?: { value: string; label: string };
};

const EMPTY_DISABLED_ELEMENTS: number[] = [];
const EMPTY_VISITED_INDICES: number[] = [];
const EMPTY_INDICES: number[] = [];

/**
 * Resolves one cell to a single visual state. Precedence matters: the answer
 * outranks a settled cell, which outranks one merely being looked at — so a
 * search hit inside an already-sorted region still reads as the hit.
 */
type CellState = "found" | "settled" | "active" | "visited" | "idle";

/**
 * Cells are a fixed square so the strip's width depends only on how MANY
 * elements there are, never on how long they are — an array of
 * "cultural biodiversity" must lay out exactly like an array of 1, 2, 3.
 * Longer values step down in size, then truncate; the full value stays
 * available as the cell's tooltip.
 */
type ValueSize = "md" | "sm" | "xs" | "2xs";

function valueSize(value: ArrayValue): ValueSize {
  const length = String(value).length;
  if (length <= 3) return "md";
  if (length <= 5) return "sm";
  if (length <= 7) return "xs";
  return "2xs";
}

const VALUE_TEXT_CLASS: Record<ValueSize, string> = {
  md: "text-base sm:text-lg md:text-xl",
  sm: "text-sm sm:text-base md:text-lg",
  xs: "text-xs sm:text-sm md:text-base",
  "2xs": "text-[10px] sm:text-xs md:text-sm",
};

const MAX_CELL_CHARS = 9;

function truncateCellValue(value: ArrayValue): string {
  const text = String(value);
  return text.length > MAX_CELL_CHARS
    ? `${text.slice(0, MAX_CELL_CHARS - 1)}…`
    : text;
}

function cellState(
  index: number,
  {
    foundIndex,
    settled,
    active,
    visited,
  }: {
    foundIndex?: number;
    settled: number[];
    active: number[];
    visited: number[];
  },
): CellState {
  if (foundIndex === index) return "found";
  if (settled.includes(index)) return "settled";
  if (active.includes(index)) return "active";
  if (visited.includes(index)) return "visited";
  return "idle";
}

// ── Springs ─────────────────────────────────────────────────────────────
const CELL_SPRING = {
  type: "spring" as const,
  stiffness: 240,
  damping: 22,
  mass: 0.8,
};
const RING_SPRING = {
  type: "spring" as const,
  stiffness: 280,
  damping: 24,
  mass: 0.7,
};
const VALUE_SPRING = {
  type: "spring" as const,
  stiffness: 200,
  damping: 18,
  mass: 0.5,
};

// ── Stable key system ───────────────────────────────────────────────────
// Detects push/pop/shift/unshift/set by diffing prev vs next data,
// so each element keeps a stable motion key across array mutations.
function useStableKeys(data: ArrayValue[]) {
  const stateRef = useRef({
    ids: [] as number[],
    data: [] as ArrayValue[],
    next: 0,
  });
  const s = stateRef.current;
  const prev = s.data;
  const prevIds = s.ids;
  const diff = data.length - prev.length;

  let ids: number[];

  if (prev.length === 0 || Math.abs(diff) > 1) {
    ids = data.map(() => s.next++);
  } else if (diff === 0) {
    ids = prevIds;
  } else {
    const point = findDiffPoint(prev, data, diff > 0);
    if (diff === 1) {
      ids = [...prevIds.slice(0, point), s.next++, ...prevIds.slice(point)];
    } else {
      ids = [...prevIds.slice(0, point), ...prevIds.slice(point + 1)];
    }
  }

  s.ids = ids;
  s.data = [...data];
  return ids;
}

function findDiffPoint(
  prev: ArrayValue[],
  next: ArrayValue[],
  isInsertion: boolean,
) {
  const shorter = isInsertion ? prev : next;
  const longer = isInsertion ? next : prev;
  for (let i = 0; i < shorter.length; i++) {
    if (shorter[i] !== longer[i]) return i;
  }
  return shorter.length;
}

// ── Component ───────────────────────────────────────────────────────────
export function ArrayStrip({
  data,
  disabledElements = EMPTY_DISABLED_ELEMENTS,
  visitedIndices = EMPTY_VISITED_INDICES,
  traversalTarget,
  name,
  nameHint,
  accessExpression,
  showIndex = true,
  activeIndex,
  dimElements,
  dimIndices,
  highlightElements,
  highlightIndices,
  className,
  activeIndices = EMPTY_INDICES,
  settledIndices = EMPTY_INDICES,
  foundIndex,
  marker,
  held,
}: ArrayStripProps) {
  const isTraversing = traversalTarget !== undefined;
  // `activeIndex` (single) and `activeIndices` (many) are the same concept at
  // two arities — merge them so the cell logic only deals with one.
  const allActive =
    activeIndex === undefined ? activeIndices : [...activeIndices, activeIndex];
  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefsMap = useRef(new Map<number, HTMLDivElement>());
  const stableKeys = useStableKeys(data);

  const setCellRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) cellRefsMap.current.set(index, el);
    else cellRefsMap.current.delete(index);
  }, []);

  return (
    <div
      className={cn(
        "canvas-array-strip relative flex w-full max-w-5xl items-start justify-center pt-4",
        className,
      )}
    >
      <div className="relative flex items-center gap-4">
        {name ? (
          <motion.div
            layout
            transition={CELL_SPRING}
            className="canvas-array-strip-name mr-1 grid min-w-16 justify-items-end text-2xl font-semibold tracking-tight text-foreground md:text-2xl"
          >
            <span className="leading-none">{name} =</span>
            <AnimatePresence mode="wait">
              {nameHint ? (
                <motion.span
                  key={nameHint}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-normal text-muted-foreground"
                >
                  {nameHint}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}

        <div className="relative" ref={containerRef}>
          <AnimatePresence>
            {held ? (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.9 }}
                transition={VALUE_SPRING}
                className="absolute -top-12 right-0 z-10 flex items-center gap-2 rounded-lg border border-amber-400/60 bg-amber-500/10 px-2.5 py-1.5 backdrop-blur-sm"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  {held.label}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-amber-400/70 bg-amber-500 text-sm font-medium text-amber-950">
                  {held.value}
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {accessExpression ? (
            <AccessExpressionLabel
              expression={accessExpression}
              activeIndex={activeIndex ?? 0}
              cellRefsMap={cellRefsMap}
              containerRef={containerRef}
            />
          ) : null}

          <AnimatePresence>
            {highlightElements ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute left-[-10px] right-[-10px] top-[-8px] rounded-xl border-2 border-dashed border-border/60 bg-background/10"
                style={{ bottom: showIndex ? "28px" : "-8px" }}
              />
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {highlightIndices && showIndex ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute bottom-[-6px] left-[-10px] right-[-10px] h-8 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5"
              />
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {highlightElements ? (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.25 }}
                className="absolute left-[calc(100%+16px)]  border-2 top-[calc(50%-22px)] whitespace-nowrap text-lg font-medium tracking-tight text-foreground md:text-xl"
              >
                elements
              </motion.span>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {highlightIndices ? (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.25 }}
                className="absolute bottom-[-4px] left-[calc(100%+16px)] whitespace-nowrap text-lg font-medium tracking-tight text-foreground md:text-xl"
              >
                indices
              </motion.span>
            ) : null}
          </AnimatePresence>

          {/*
            Discrete plates with a gap, matching StackStrip — same border,
            surface, radius and drop shadow, so an array cell and a stack
            cell read as the same physical object seen from two angles.
          */}
          <motion.div
            layout
            transition={CELL_SPRING}
            className="canvas-array-strip-plates flex gap-2 border-2 px-3 py-2 bg-muted/40 border-dashed border-foreground/25 rounded-2xl"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {data.map((item, index) => {
                const isDisabled = disabledElements.includes(index);
                const isActive = activeIndex === index;
                const isVisited = visitedIndices.includes(index) || isActive;
                const isTargetHit =
                  isTraversing && isVisited && index === traversalTarget;
                const isTraversalMiss =
                  isTraversing && isVisited && !isTargetHit;
                const isPlainActive = !isTraversing && isActive;
                const shouldDim = dimElements && !isPlainActive && !isTargetHit;
                // Traversal keeps its own colour rules (the Traverse button
                // path); the agent's states only apply when no traversal is
                // running, so the two never fight over the same cell.
                const agentState = isTraversing
                  ? "idle"
                  : cellState(index, {
                      foundIndex,
                      settled: settledIndices,
                      active: allActive,
                      visited: visitedIndices,
                    });

                return (
                  <motion.div
                    key={stableKeys[index]}
                    layout
                    initial={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
                    transition={CELL_SPRING}
                    className="flex flex-col items-center  "
                  >
                    <motion.div
                      ref={(el) => setCellRef(index, el)}
                      layout
                      transition={CELL_SPRING}
                      // Truncation lives on the value span, not here: an
                      // overflow-hidden cell also clipped the pivot label that
                      // hangs below it.
                      data-value-size={valueSize(item)}
                      className={cn(
                        "canvas-array-strip-cell relative flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-sm border border-border bg-[#4C4C4C] px-1 tracking-tight text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition-colors duration-300 sm:h-14 sm:w-14 md:h-16 md:w-16",
                        VALUE_TEXT_CLASS[valueSize(item)],
                        isTraversalMiss &&
                          "border-border bg-muted/50 text-muted-foreground opacity-40",
                        isTargetHit &&
                          "border-emerald-500/60 bg-emerald-500 text-white",
                        isPlainActive &&
                          "border-primary/50 bg-primary text-primary-foreground",
                        agentState === "found" &&
                          "border-emerald-400 bg-emerald-500 text-white ring-2 ring-emerald-400/50",
                        agentState === "settled" &&
                          "border-emerald-600/50 bg-emerald-700 text-white",
                        agentState === "active" &&
                          "border-amber-400/70 bg-amber-500 text-amber-950",
                        agentState === "visited" &&
                          "bg-muted/50 text-muted-foreground opacity-45",
                        isDisabled && "opacity-30",
                        shouldDim && "opacity-40",
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
                          animate={{
                            opacity: 1,
                            scale: 1,
                            filter: "blur(0px)",
                          }}
                          exit={{ opacity: 0, scale: 0.7, filter: "blur(2px)" }}
                          transition={VALUE_SPRING}
                          className="block max-w-full select-none truncate"
                          title={String(item)}
                        >
                          {truncateCellValue(item)}
                        </motion.span>
                      </AnimatePresence>

                      <AnimatePresence>
                        {marker?.index === index ? (
                          <motion.span
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18 }}
                            className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400"
                          >
                            {marker.label}
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </motion.div>

                    {/* {showIndex ? (
                      <motion.span
                        layout
                        transition={CELL_SPRING}
                        className={cn(
                          "mt-1.5 text-xs font-medium tabular-nums text-muted-foreground transition-opacity duration-300 md:text-sm",
                          dimIndices && "opacity-35",
                        )}
                      >
                        {index}
                      </motion.span>
                    ) : null} */}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
          <motion.div
            layout
            transition={CELL_SPRING}
            // Mirrors the plates row above — same gap, same inline padding, and
            // a transparent border matching the plates' 2px border — so each
            // index is centred under its own cell. It previously used a fixed
            // 4rem per index, which drifted as soon as the presenter resized
            // the cells.
            className="canvas-array-strip-index-row flex gap-2 border-2 border-y-0 border-transparent px-3 py-1"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {data.map((item, index) => {

                return (
                  <motion.div
                    key={stableKeys[index]}
                    layout
                    initial={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
                    transition={CELL_SPRING}
                    className="canvas-array-strip-index flex w-[3.25rem] shrink-0 flex-col items-center sm:w-14 md:w-16"
                  >
                    {/* <motion.div
                      ref={(el) => setCellRef(index, el)}
                      layout
                      transition={CELL_SPRING}
                      className={cn(
                        "relative flex items-center justify-center rounded-sm border border-border bg-[#4C4C4C] text-base tracking-tight text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition-colors duration-300 sm:h-14 sm:w-14 sm:text-lg md:h-16 md:w-16 md:text-xl",
                        isTraversalMiss &&
                          "border-border bg-muted/50 text-muted-foreground opacity-40",
                        isTargetHit &&
                          "border-emerald-500/60 bg-emerald-500 text-white",
                        isPlainActive &&
                          "border-primary/50 bg-primary text-primary-foreground",
                        isDisabled && "opacity-30",
                        shouldDim && "opacity-40",
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
                          animate={{
                            opacity: 1,
                            scale: 1,
                            filter: "blur(0px)",
                          }}
                          exit={{ opacity: 0, scale: 0.7, filter: "blur(2px)" }}
                          transition={VALUE_SPRING}
                          className="pointer-events-none select-none"
                        >
                          {item}
                        </motion.span>
                      </AnimatePresence>
                    </motion.div> */}

                    {showIndex ? (
                      <motion.span
                        layout
                        transition={CELL_SPRING}
                        className={cn(
                          "mt-1.5 text-xs font-medium tabular-nums text-muted-foreground transition-opacity duration-300 md:text-sm",
                          dimIndices && "opacity-35",
                        )}
                      >
                        {index}
                      </motion.span>
                    ) : null}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function AccessExpressionLabel({
  expression,
  activeIndex,
  cellRefsMap,
  containerRef,
}: {
  expression: string;
  activeIndex: number;
  cellRefsMap: React.RefObject<Map<number, HTMLDivElement> | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [leftPx, setLeftPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const cell = cellRefsMap.current?.get(activeIndex);
    const container = containerRef.current;
    if (!cell || !container) return;

    const cellRect = cell.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setLeftPx(cellRect.left + cellRect.width / 2 - containerRect.left);
  }, [activeIndex, cellRefsMap, containerRef]);

  const left = leftPx !== null ? `${leftPx}px` : `${activeIndex * 64 + 32}px`;

  return (
    <motion.div
      layout
      transition={RING_SPRING}
      className="absolute -top-12 -translate-x-1/2 text-center text-xl font-semibold tracking-tight text-foreground md:-top-14 md:text-2xl"
      style={{ left }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={expression}
          initial={{ opacity: 0, y: 4, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -4, filter: "blur(2px)" }}
          transition={VALUE_SPRING}
        >
          {expression}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}
