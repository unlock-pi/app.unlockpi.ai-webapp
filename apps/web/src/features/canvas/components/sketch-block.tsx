"use client";

import { DEFAULT_SKETCH_WIDTH_PERCENT } from "@/features/canvas/lib/sketch-sizes";
import type { SketchBlockProps } from "@/features/canvas/types/canvas-types";

export function SketchBlock({
  widthPercent = DEFAULT_SKETCH_WIDTH_PERCENT,
  aiContext,
  src,
  aspectRatio = 1.6,
}: SketchBlockProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
      <div className="flex justify-center">
        {src ? (
          // Rendered via <img> with a data: URI rather than next/image: the
          // source is inline SVG with no remote origin to optimise, and an
          // <img> keeps any markup in the drawing inert.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={aiContext || "Drawing"}
            style={{ width: `${widthPercent}%`, aspectRatio }}
            className="h-auto max-w-full object-contain"
          />
        ) : (
          <div className="grid min-h-40 w-full place-items-center rounded-lg border border-dashed border-border/70 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
            Draw in the Draw panel, then drag your sketch onto the canvas.
          </div>
        )}
      </div>
    </section>
  );
}
