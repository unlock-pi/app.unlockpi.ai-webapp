"use client";

import { useMemo, useState } from "react";

import {
  NumberPaginationStrip,
  type HighlightRule,
} from "@/components/data-structure/number-pagination-strip";
import { cn } from "@/lib/utils";

type HighlightMode = "none" | "multiples-5" | "multiples-10" | "primes";

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

const MODES: { id: HighlightMode; label: string }[] = [
  { id: "none", label: "No highlight" },
  { id: "multiples-5", label: "Multiples of 5" },
  { id: "multiples-10", label: "Multiples of 10" },
  { id: "primes", label: "Primes" },
];

export default function NumberStripDemoPage() {
  const [mode, setMode] = useState<HighlightMode>("none");

  const highlights: HighlightRule[] = useMemo(() => {
    switch (mode) {
      case "multiples-5":
        return [{ id: "m5", label: "Multiples of 5", predicate: (n: number) => n % 5 === 0 }];
      case "multiples-10":
        return [{ id: "m10", label: "Multiples of 10", predicate: (n: number) => n % 10 === 0 }];
      case "primes":
        return [{ id: "primes", label: "Primes", predicate: isPrime }];
      default:
        return [];
    }
  }, [mode]);

  return (
    <div className="flex flex-1 flex-col items-center gap-10 px-8 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Number pagination strip
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Drag the scrubber below the numbers to slide the window open.
          Release, or drag your cursor off the track, to stop and highlight
          where you landed. Click a &ldquo;⋯&rdquo; to jump straight into it.
        </p>
      </div>

      <NumberPaginationStrip total={100} highlights={highlights} />

      <div className="flex flex-wrap items-center justify-center gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "rounded-full border border-border px-3 py-1.5 text-sm font-medium transition-colors",
              mode === m.id
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-foreground/5",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
