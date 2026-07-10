"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { PlayIcon, RotateCcwIcon } from "lucide-react";

const TRAVERSAL_STEP_MS = 600;

type TraversalTriggerProps = {
  length: number;
  traversalTarget?: number;
  highlightedIndex?: number;
  visitedIndices?: number[];
  onUpdate: (nextHighlighted: number | undefined, nextVisited: number[]) => void;
};

function computeNextIndex(
  current: number,
  target: number,
  length: number,
): number | null {
  if (length <= 0 || current === target) {
    return null;
  }

  if (current < 0) {
    return target >= 0 ? 0 : null;
  }

  return current < target
    ? Math.min(current + 1, length - 1)
    : Math.max(current - 1, 0);
}

export function TraversalTrigger({
  length,
  traversalTarget,
  highlightedIndex,
  visitedIndices = [],
  onUpdate,
}: TraversalTriggerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (traversalTarget === undefined) {
    return null;
  }

  const current = highlightedIndex ?? -1;
  const reachedTarget = current === traversalTarget;

  function stopPlaying() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }

  const handleTraverse = (event: MouseEvent) => {
    event.stopPropagation();

    if (isPlaying) {
      return;
    }

    setIsPlaying(true);
    let step = current;
    let visited = [...visitedIndices];

    intervalRef.current = setInterval(() => {
      const next = computeNextIndex(step, traversalTarget, length);

      if (next === null) {
        stopPlaying();
        return;
      }

      step = next;
      visited = [...visited, next];
      onUpdate(step, visited);

      if (step === traversalTarget) {
        stopPlaying();
      }
    }, TRAVERSAL_STEP_MS);
  };

  const handleReset = (event: MouseEvent) => {
    event.stopPropagation();
    stopPlaying();
    onUpdate(undefined, []);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleTraverse}
        disabled={isPlaying}
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/60 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PlayIcon className="size-3.5" />
        {isPlaying ? "Traversing…" : "Traverse"}
      </button>
      <button
        type="button"
        onClick={handleReset}
        disabled={current < 0 && !isPlaying}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RotateCcwIcon className="size-3.5" />
        Reset
      </button>
      {reachedTarget ? (
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Target found at index {traversalTarget}.
        </span>
      ) : null}
    </div>
  );
}
