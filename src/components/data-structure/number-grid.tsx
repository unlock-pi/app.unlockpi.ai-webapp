"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import {
  colorFor,
  gradientStop,
  matchesFor,
  type HighlightRule,
} from "@/components/data-structure/number-cell-shared";
import { cn } from "@/lib/utils";

/**
 * The rows-and-columns counterpart to `NumberPaginationStrip` — "Population
 * of 100" rather than "ordered sequence". A genuinely separate component:
 * it shares only the pure highlight/color helpers, never the strip's own
 * pagination-window or drag-scrubber logic, which don't apply to a grid.
 *
 * A thousand numbers can't be shown as one grid, so it paginates in fixed
 * blocks of `rows * cols` (100 by default — "go to the next hundred"),
 * fully controlled via `page`/`onPageChange` rather than owning its own
 * pagination state, so a traversal elsewhere can drive it across page
 * boundaries the same way it drives the strip's window.
 */
export type NumberGridProps = {
  /** Highest number in the grid. Numbers always start at 1. */
  total?: number;
  rows?: number;
  cols?: number;
  /** Which block of `rows * cols` numbers is showing, 0-indexed. */
  page?: number;
  highlights?: HighlightRule[];
  division?: { divisor: number } | null;
  /** The number a traversal is visiting right now — see NumberPaginationStrip. */
  cursor?: number | null;
  accumulator?: { label: string; value: string } | null;
  extracted?: boolean;
  className?: string;
  /** Called when a pager arrow is clicked, so a parent can drive `page`. */
  onPageChange?: (page: number) => void;
};

const CELL_SPRING = { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.6 };
const MAX_TRAY_CELLS = 48;
const TRAY_STAGGER_S = 0.02;

export function NumberGrid({
  total = 100,
  rows = 10,
  cols = 10,
  page = 0,
  highlights = [],
  division = null,
  cursor = null,
  accumulator = null,
  extracted = false,
  className,
  onPageChange,
}: NumberGridProps) {
  const blockSize = rows * cols;
  const totalPages = Math.max(1, Math.ceil(total / blockSize));
  const currentPage = Math.min(Math.max(page, 0), totalPages - 1);

  const blockStart = currentPage * blockSize + 1;
  const blockEnd = Math.min(total, blockStart + blockSize - 1);

  const values = useMemo(
    () => Array.from({ length: Math.max(0, blockEnd - blockStart + 1) }, (_, i) => blockStart + i),
    [blockStart, blockEnd],
  );

  const extractedSet = useMemo(() => {
    if (!extracted || highlights.length === 0) return new Set<number>();
    return new Set(values.filter((n) => matchesFor(n, highlights).length > 0));
  }, [extracted, highlights, values]);

  const extractedValues = useMemo(() => Array.from(extractedSet).sort((a, b) => a - b), [extractedSet]);

  const goToPage = (next: number) => onPageChange?.(Math.min(Math.max(next, 0), totalPages - 1));

  return (
    <div className={cn("flex w-full max-w-3xl flex-col items-center gap-4", className)}>
      <div className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-foreground/25 bg-muted/40 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {blockStart}–{blockEnd}
          {totalPages > 1 ? ` · block ${currentPage + 1} of ${totalPages}` : ""}
        </p>

        <div
          className="grid justify-center gap-x-2 gap-y-2 sm:gap-x-2.5 sm:gap-y-2.5"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          <AnimatePresence initial={false}>
            {values.map((value) => {
              if (extractedSet.has(value)) return null;

              const matches = matchesFor(value, highlights);
              const remainder = division ? value % division.divisor : null;
              const isDissolved = division !== null && remainder === 0;
              const isCursor = cursor === value;
              const cellScale = isCursor ? 1.32 : matches.length > 0 ? 1.1 : 1;

              return (
                <motion.div
                  key={value}
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: cellScale }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={CELL_SPRING}
                  style={{ zIndex: isCursor ? 10 : undefined }}
                  className="relative flex flex-col items-center"
                >
                  {division && !isDissolved ? (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-foreground/10 px-1 text-[9px] font-semibold tabular-nums text-foreground/70">
                      +{remainder}
                    </span>
                  ) : null}

                  <div
                    className={cn(
                      "grid-cell flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-[#4C4C4C] text-[11px] font-medium tabular-nums text-white shadow-[0_4px_10px_rgba(0,0,0,0.24)] transition-colors duration-300 sm:h-8 sm:w-8 sm:text-xs",
                      matches.length === 1 && colorFor(matches[0], highlights.indexOf(matches[0])),
                      matches.length >= 2 &&
                        "border-transparent text-white ring-2 ring-offset-1 ring-offset-background",
                      isDissolved && "text-white/40 line-through decoration-2",
                      isCursor && "ring-[3px] ring-foreground ring-offset-1 ring-offset-background",
                    )}
                    style={
                      matches.length >= 2
                        ? {
                            background: `linear-gradient(135deg, ${gradientStop(matches[0], highlights.indexOf(matches[0]))} 50%, ${gradientStop(matches[1], highlights.indexOf(matches[1]))} 50%)`,
                          }
                        : undefined
                    }
                  >
                    {value}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              aria-label="Previous hundred"
              className="grid size-7 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-foreground/10 disabled:opacity-30"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
              aria-label="Next hundred"
              className="grid size-7 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-foreground/10 disabled:opacity-30"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {extracted && extractedValues.length > 0 ? (
          <motion.div
            key="tray"
            layout
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={CELL_SPRING}
            className="flex w-full max-w-2xl flex-col items-center gap-2 rounded-2xl border-2 border-primary/30 bg-primary/5 px-4 py-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
              Pulled out{highlights.length ? ` — ${highlights.map((h) => h.label).join(" · ")}` : ""} ({extractedValues.length})
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <AnimatePresence initial={false}>
                {extractedValues.slice(0, MAX_TRAY_CELLS).map((value, index) => {
                  const matches = matchesFor(value, highlights);
                  return (
                    <motion.div
                      key={value}
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.5 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ ...CELL_SPRING, delay: index * TRAY_STAGGER_S }}
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums text-white shadow-sm sm:h-8 sm:w-8",
                        matches.length >= 1
                          ? colorFor(matches[0], highlights.indexOf(matches[0]))
                          : "border-border bg-[#4C4C4C]",
                      )}
                    >
                      {value}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {extractedValues.length > MAX_TRAY_CELLS ? (
                <span className="text-xs font-medium text-muted-foreground">
                  +{extractedValues.length - MAX_TRAY_CELLS} more
                </span>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {accumulator ? (
          <motion.div
            key="accumulator"
            layout
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={CELL_SPRING}
            className="flex items-center gap-2 rounded-xl border border-border bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur-sm"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {accumulator.label}
            </span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{accumulator.value}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
