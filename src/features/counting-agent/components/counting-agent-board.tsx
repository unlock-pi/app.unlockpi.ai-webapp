"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";

import {
  NumberPaginationStrip,
  type HighlightRule as StripHighlightRule,
} from "@/components/data-structure/number-pagination-strip";
import type { CountingFrame } from "@/features/counting-agent/lib/counting-types";
import { cn } from "@/lib/utils";

type Props = {
  view: CountingFrame;
  className?: string;
};

/**
 * Renders one strip beat. Mirrors `arrays-agent-board.tsx`: everything it
 * needs is in `view`, so the same component works for a voice command, a
 * demo button, or a replay. `highlights` predicates are derived here from
 * the serializable `{ of }` rules the agent state carries.
 */
export function CountingAgentBoard({ view, className }: Props) {
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
