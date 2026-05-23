"use client";

import { cn } from "@/lib/utils";

type ArrayValue = string | number;

type ArrayStripProps = {
  data: ArrayValue[];
  disabledElements?: number[];
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

export function ArrayStrip({
  data,
  disabledElements = [],
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
  return (
    <div
      className={cn("relative flex w-full max-w-5xl items-start justify-center pt-4", className)}
    >
      <div className="relative flex items-center gap-4">
        {name ? (
          <div className="mr-1 grid min-w-16 justify-items-end text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            <span className="leading-none">{name} =</span>
            {nameHint ? (
              <span className="text-sm font-normal text-muted-foreground">{nameHint}</span>
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

          <div className="flex gap-4 md:gap-5">
            {data.map((item, index) => {
              const isDisabled = disabledElements.includes(index);
              const isActive = activeIndex === index;

              return (
                <div key={`${item}-${index}`} className="grid justify-items-center gap-3">
                  {showIndex ? (
                    <span className={cn("text-sm font-medium text-muted-foreground md:text-base", dimIndices && "opacity-35")}>
                      {index}
                    </span>
                  ) : null}

                  <div
                    className={cn(
                      "flex h-18 w-18 items-center justify-center rounded-2xl border border-border bg-background text-2xl font-semibold tracking-tight text-foreground shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition md:h-20 md:w-20 md:text-[2rem]",
                      isDisabled && "opacity-30",
                      dimElements && "opacity-40",
                      isActive && "border-primary/50 bg-primary/10 shadow-[0_12px_28px_rgba(220,38,38,0.22)]"
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
