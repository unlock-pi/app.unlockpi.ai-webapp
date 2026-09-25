import { cn } from "@/lib/utils";

type InputStringProps = {
  symbols: string[];
  currentIndex: number;
};

/** Compact input cells show progress without stretching across the frame. */
export function InputString({ symbols, currentIndex }: InputStringProps) {
  return (
    <div
      className="flex min-w-0 max-w-full items-center gap-3"
      aria-label={`Input string ${symbols.join("") || "epsilon"}`}
    >
      <span className="shrink-0 text-xs font-medium text-muted-foreground">Input</span>
      <div className="flex max-w-full items-center gap-1 overflow-x-auto py-1">
        {symbols.length ? (
          symbols.map((symbol, index) => (
            <span
              key={`${symbol}-${index}`}
              aria-current={index === currentIndex ? "step" : undefined}
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-md border border-border bg-background font-mono text-sm font-semibold text-foreground transition-colors",
                index < currentIndex && "bg-muted/40 text-muted-foreground",
                index === currentIndex && "border-primary bg-primary text-primary-foreground",
              )}
            >
              {symbol}
            </span>
          ))
        ) : (
          <span className="font-mono text-sm text-muted-foreground">ε</span>
        )}
      </div>
    </div>
  );
}
