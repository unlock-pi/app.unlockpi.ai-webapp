"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ArrayLessonCell, ArrayLessonDefinition, ArrayLessonTone } from "@/features/courses/arrays/lib/arrays-course";

const toneClasses: Record<ArrayLessonTone, string> = {
  default: "border-border/70 bg-background/75 text-foreground",
  active: "border-primary/60 bg-primary/12 text-primary shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
  muted: "border-border/60 bg-muted/45 text-muted-foreground",
  success: "border-emerald-500/50 bg-emerald-500/12 text-emerald-300",
  warning: "border-amber-500/50 bg-amber-500/12 text-amber-200",
};

const waveOffsets = [4, -10, 8, -14, 6, -8, 4];

interface ArrayVisualizerProps {
  lesson: ArrayLessonDefinition;
}

export function ArrayVisualizer({ lesson }: ArrayVisualizerProps) {
  const [selectedIndex, setSelectedIndex] = useState(lesson.activeIndex);

  const selectedCell = useMemo<ArrayLessonCell>(
    () => lesson.cells[selectedIndex] ?? lesson.cells[0],
    [lesson.cells, selectedIndex]
  );

  return (
    <div className="rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Array visualized
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{lesson.visualTitle}</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {lesson.visualHint}
          </p>
        </div>
        <Badge variant="secondary">interactive</Badge>
      </div>

      <div className="relative mt-8 overflow-x-auto pb-4">
        <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
        <div className="relative flex min-w-max items-end gap-4 px-2 py-6">
          {lesson.cells.map((cell, index) => {
            const isSelected = index === selectedIndex;
            const tone = cell.tone ?? "default";
            const offset = waveOffsets[index % waveOffsets.length];

            return (
              <button
                key={cell.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                onMouseEnter={() => setSelectedIndex(index)}
                className="group flex flex-col items-center gap-3 text-left"
                style={{ transform: `translateY(${offset}px)` }}
              >
                <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors group-hover:text-foreground">
                  {index}
                </span>
                <div
                  className={cn(
                    "flex h-24 w-24 items-center justify-center rounded-[1.75rem] border text-xl font-semibold transition-all duration-200",
                    "hover:-translate-y-1 hover:scale-[1.03]",
                    toneClasses[tone],
                    isSelected && "scale-[1.06] border-primary/70 shadow-[0_18px_38px_rgba(59,130,246,0.12)]"
                  )}
                >
                  {cell.value}
                </div>
                <Badge variant={isSelected ? "default" : "outline"}>{cell.tag}</Badge>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-border/60 bg-background/55 p-5 md:grid-cols-[160px_1fr]">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Selected slot
          </p>
          <div className="text-4xl font-semibold tracking-tight">
            [{selectedIndex}]
          </div>
          <div className="text-sm text-muted-foreground">Value: {selectedCell.value}</div>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">{selectedCell.tag}</p>
          <p className="text-sm leading-6 text-muted-foreground">{selectedCell.detail}</p>
        </div>
      </div>
    </div>
  );
}
