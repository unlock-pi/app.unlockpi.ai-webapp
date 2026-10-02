type StackStripProps = {
  data: string[];
  name: string;
  activeIndex?: number;
};

export function StackStrip({ data, name, activeIndex }: StackStripProps) {
  const cells = data.length ? data : ["ε"];

  return (
    <section aria-label={name} className="flex min-h-36 flex-col gap-2">
      <h4 className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
        {name}
      </h4>
      <div className="flex min-h-24 flex-col-reverse gap-1 rounded-lg border border-border bg-background/80 p-2">
        {cells.map((symbol, index) => {
          const isActive = activeIndex === index && data.length > 0;
          return (
            <div
              key={`${symbol}-${index}`}
              className={`rounded-md border px-2 py-1 text-center font-mono text-sm ${
                isActive
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/70 bg-muted/30"
              }`}
            >
              {symbol}
            </div>
          );
        })}
      </div>
    </section>
  );
}

