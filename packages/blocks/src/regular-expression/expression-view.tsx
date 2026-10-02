"use client";

import type { RegularExpressionExpressionSegment } from "./types";
import { cn } from "@unlockpi/ui";

export type ExpressionNodeSpan = {
  id: string;
  start: number;
  end: number;
};

type ExpressionViewProps = {
  expression: string;
  segments?: RegularExpressionExpressionSegment[];
  nodeSpans?: ExpressionNodeSpan[];
  selectedNodeId?: string | null;
  highlightedNodeIds?: string[];
  activeNodeId?: string | null;
  className?: string;
};

const characterEntries = (expression: string) => {
  const characters: Array<{ value: string; start: number }> = [];
  for (let start = 0; start < expression.length;) {
    const value = String.fromCodePoint(expression.codePointAt(start) as number);
    characters.push({ value, start });
    start += value.length;
  }
  return characters;
};

/** Displays supplied source spans; parsing remains in the RE domain engine. */
export function ExpressionView({
  expression,
  segments = [],
  nodeSpans = [],
  selectedNodeId,
  highlightedNodeIds = [],
  activeNodeId,
  className,
}: ExpressionViewProps) {
  const isStyledAt = (offset: number, nodeIds: readonly string[]) =>
    nodeSpans.some(
      (span) =>
        nodeIds.includes(span.id) && offset >= span.start && offset < span.end,
    );

  const surfaceClass = cn(
    "canvas-expression-surface flex min-h-20 min-w-0 items-center justify-center overflow-x-auto rounded-xl border border-border/70 bg-background/75 px-6 py-4 font-mono text-2xl font-semibold tracking-[0.08em] text-foreground shadow-inner sm:text-3xl",
    className,
  );

  if (nodeSpans.length) {
    const characters = characterEntries(expression);

    return (
      <output
        className={surfaceClass}
        aria-label={`Regular expression ${expression || "epsilon"}`}
      >
        <span className="flex min-w-max items-center">
          {characters.length
            ? characters.map(({ value, start }) => {
                const highlighted = isStyledAt(start, highlightedNodeIds);
                const selected = selectedNodeId
                  ? isStyledAt(start, [selectedNodeId])
                  : false;
                const active = activeNodeId
                  ? isStyledAt(start, [activeNodeId])
                  : false;

                return (
                  <span
                    key={start}
                    data-expression-offset={start}
                    className={cn(
                      "rounded-sm px-0.5 py-1 transition-colors",
                      highlighted && "bg-warning/20 text-warning",
                      selected &&
                        "bg-primary/15 text-primary ring-1 ring-primary/35",
                      active &&
                        "bg-primary text-primary-foreground ring-2 ring-primary/35",
                    )}
                  >
                    {value}
                  </span>
                );
              })
            : "ε"}
        </span>
      </output>
    );
  }

  const suppliedText = segments.map((segment) => segment.text).join("");
  const visibleSegments =
    segments.length > 0 && suppliedText === expression
      ? segments
      : [
          {
            id: "expression",
            text: expression || "ε",
            kind: "group" as const,
          },
        ];

  return (
    <output
      className={surfaceClass}
      aria-label={`Regular expression ${expression || "epsilon"}`}
    >
      <span className="flex min-w-max items-center">
        {visibleSegments.map((segment) => {
          const highlighted =
            highlightedNodeIds.includes(segment.id) ||
            segment.status === "highlighted";
          const selected =
            selectedNodeId === segment.id || segment.status === "selected";
          const active =
            activeNodeId === segment.id || segment.status === "active";

          return (
            <span
              key={segment.id}
              data-expression-node={segment.id}
              className={cn(
                "rounded-sm px-0.5 py-1 transition-colors",
                highlighted && "bg-warning/20 text-warning",
                selected && "bg-primary/15 text-primary ring-1 ring-primary/35",
                active &&
                  "bg-primary text-primary-foreground ring-2 ring-primary/35",
              )}
            >
              {segment.text}
            </span>
          );
        })}
      </span>
    </output>
  );
}
