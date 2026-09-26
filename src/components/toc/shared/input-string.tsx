"use client";

import { cn } from "@/lib/utils";

export type InputSequenceResult = "unknown" | "accepted" | "rejected";

export type InputStringProps = {
  symbols: string[];
  currentIndex?: number;
  highlightedIndex?: number;
  result?: InputSequenceResult;
  label?: string;
  className?: string;
};

/** Domain-neutral input sequence cells for TOC execution and derivation views. */
export function InputString({
  symbols,
  currentIndex = 0,
  highlightedIndex,
  result = "unknown",
  label = "Input",
  className,
}: InputStringProps) {
  const activeIndex = highlightedIndex ?? currentIndex;

  return (
    <div
      className={cn("grid min-w-0 max-w-full gap-1.5", className)}
      aria-label={`${label} string ${symbols.join("") || "epsilon"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        {result !== "unknown" ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              result === "accepted"
                ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {result}
          </span>
        ) : null}
      </div>

      <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-0.5">
        {symbols.length ? (
          symbols.map((symbol, index) => {
            const consumed = index < currentIndex;
            const active =
              index === activeIndex && currentIndex < symbols.length;

            return (
              <span
                key={`${symbol}-${index}`}
                aria-current={active ? "step" : undefined}
                data-input-state={
                  active ? "active" : consumed ? "consumed" : "remaining"
                }
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg border border-border/80 bg-background font-mono text-sm font-semibold text-foreground transition-colors",
                  consumed &&
                    "border-border/50 bg-muted/50 text-muted-foreground",
                  active &&
                    "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20",
                )}
              >
                {symbol}
              </span>
            );
          })
        ) : (
          <span className="grid h-8 min-w-10 place-items-center rounded-lg border border-dashed border-border bg-background px-2 font-mono text-sm text-muted-foreground">
            ε
          </span>
        )}
      </div>
    </div>
  );
}
