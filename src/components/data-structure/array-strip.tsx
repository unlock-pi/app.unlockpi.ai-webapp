"use client";

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
};

const EMPTY_DISABLED_ELEMENTS: number[] = [];
const EMPTY_VISITED_INDICES: number[] = [];

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
}: ArrayStripProps) {
  const isTraversing = traversalTarget !== undefined;

  return (
    <div
      className={cn(
        "relative flex w-full max-w-5xl items-start justify-center pt-4",
        className,
      )}
    >
      <div className="relative flex items-center gap-4">
        {name ? (
          <div className="mr-1 grid min-w-16 justify-items-end text-2xl font-semibold tracking-tight text-foreground md:text-2xl">
            <span className="leading-none">{name} =</span>
            {nameHint ? (
              <span className="text-sm font-normal text-muted-foreground">
                {nameHint}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="relative">
          {accessExpression ? (
            <div
              className="absolute -top-16 text-center text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
              style={{
                left: `${(activeIndex ?? 0) * 112 + 42}px`,
              }}
            >
              {accessExpression}
            </div>
          ) : null}

          {highlightIndices ? (
            <div className="absolute -top-3 left-[-14px] right-[-14px] h-9 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5" />
          ) : null}

          {highlightElements ? (
            <div className="absolute left-[-14px] right-[-14px] top-10 h-24 rounded-2xl border-2 border-dashed border-border bg-background/20" />
          ) : null}

          {highlightIndices ? (
            <span className="absolute left-[calc(100%+20px)] top-[-4px] text-2xl font-medium tracking-tight text-foreground">
              indices
            </span>
          ) : null}

          {highlightElements ? (
            <span className="absolute left-[calc(100%+20px)] top-[44px] text-2xl font-medium tracking-tight text-foreground">
              elements
            </span>
          ) : null}

          <div className="flex gap-2">
            {data.map((item, index) => {
              const isDisabled = disabledElements.includes(index);
              const isActive = activeIndex === index;
              const isVisited = visitedIndices.includes(index) || isActive;
              const isTargetHit = isTraversing && isVisited && index === traversalTarget;
              const isTraversalMiss = isTraversing && isVisited && !isTargetHit;
              const isPlainActive = !isTraversing && isActive;

              return (
                <div key={`${item}-${index}`} className="grid justify-items-center gap-2">
                  {showIndex ? (
                    <span
                      className={cn(
                        "text-sm text-muted-foreground",
                        dimIndices && "opacity-35",
                      )}
                    >
                      {index}
                    </span>
                  ) : null}

                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-lg font-semibold tracking-tight text-foreground shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition md:h-12 md:w-12 md:text-xl",
                      isDisabled && "opacity-30",
                      dimElements && "opacity-40",
                      isTraversalMiss && "border-border bg-muted/50 opacity-40",
                      isTargetHit &&
                        "border-emerald-500/60 bg-emerald-500 text-white",
                      isPlainActive &&
                        "border-primary/50 bg-primary text-primary-foreground",
                    )}
                  >
                    {item}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
