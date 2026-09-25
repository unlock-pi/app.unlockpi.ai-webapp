"use client";

import { AnimatePresence, motion } from "motion/react";

import { ArrayView } from "@/components/data-structure/array";
import type { ArrayFrame } from "@/features/arrays-agent/lib/array-types";
import { cn } from "@/lib/utils";

type Props = {
  view: ArrayFrame;
  name: string;
  showIndices: boolean;
  className?: string;
};

/**
 * Renders one animation beat. Everything it needs is in `view` — which is why
 * the same component works whether the beat came from a voice command, a demo
 * button, or a replay.
 */
export function ArraysAgentBoard({ view, name, showIndices, className }: Props) {
  return (
    <div className={cn("grid w-full gap-4", className)}>
      <div className="flex min-h-[9rem] w-full items-center justify-center">
        {view.values.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No array on the board. Say &ldquo;create an array with 10, 20, 30&rdquo; to start.
          </p>
        ) : (
          <ArrayView
            data={view.values}
            name={name}
            showIndex={showIndices}
            activeIndices={view.active}
            settledIndices={view.settled}
            visitedIndices={view.visited}
            foundIndex={view.found}
            marker={view.marker}
            caret={view.caret}
            gapIndex={view.gap}
            held={view.held}
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
