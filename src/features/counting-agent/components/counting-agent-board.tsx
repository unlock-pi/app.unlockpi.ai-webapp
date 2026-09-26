"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";

import { NumberGrid } from "@/components/data-structure/number-grid";
import {
  NumberPaginationStrip,
  type HighlightRule as StripHighlightRule,
} from "@/components/data-structure/number-pagination-strip";
import type { CountingFrame } from "@/features/counting-agent/lib/counting-types";
import { cn } from "@/lib/utils";

type Props = {
  view: CountingFrame;
  className?: string;
  /** Called with the 0-indexed page when the grid's own pager arrows are used directly (not via voice). */
  onGridPageChange?: (page: number) => void;
};

/**
 * Renders one strip beat. Mirrors `arrays-agent-board.tsx`: everything it
 * needs is in `view`, so the same component works for a voice command, a
 * demo button, or a replay. `highlights` predicates are derived here from
 * the serializable `{ of }` rules the agent state carries. Switches between
 * the horizontal strip and the rows-and-columns grid purely on `view.view` —
 * the two visual components stay independent of each other.
 */
export function CountingAgentBoard({ view, className, onGridPageChange }: Props) {
  const highlights: StripHighlightRule[] = useMemo(
    () =>
      view.highlights.map((rule) => ({
        id: rule.id,
        label: rule.label,
        predicate: (n: number) => n % rule.of === 0,
      })),
    [view.highlights],
  );

  return (
    <div className={cn("grid w-full gap-4", className)}>
      <div className="flex min-h-[9rem] w-full items-center justify-center">
        {view.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            No strip on the board. Say &ldquo;show numbers from 1 to 100&rdquo; to start.
          </p>
        ) : view.view === "grid" ? (
          <NumberGrid
            total={view.total}
            page={view.gridPage ?? 0}
            highlights={highlights}
            division={view.division}
            cursor={view.cursor ?? null}
            accumulator={view.accumulator ?? null}
            extracted={view.extracted ?? false}
            onPageChange={onGridPageChange}
            className="max-w-none"
          />
        ) : (
          <NumberPaginationStrip
            total={view.total}
            order={view.order}
            mode={view.mode}
            highlights={highlights}
            division={view.division}
            cursor={view.cursor ?? null}
            accumulator={view.accumulator ?? null}
            extracted={view.extracted ?? false}
            className="max-w-none"
          />
        )}
      </div>

      <div className="flex min-h-[1.5rem] items-center justify-center">
        <AnimatePresence mode="wait">
          {view.note ? (
            <motion.p
              key={view.note}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="text-center text-sm text-muted-foreground"
            >
              {view.note}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
