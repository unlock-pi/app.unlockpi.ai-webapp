"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ArrayStrip } from "@/components/data-structure/array-strip";
import { cn } from "@/lib/utils";

const INITIAL_DATA = [10, 20, 30, 40, 50];

export default function Page() {
  const [data, setData] = useState<(string | number)[]>(INITIAL_DATA);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [disabledElements, setDisabledElements] = useState<number[]>([]);
  const [showIndex, setShowIndex] = useState(true);
  const [highlightElements, setHighlightElements] = useState(false);
  const [highlightIndices, setHighlightIndices] = useState(false);
  const [dimElements, setDimElements] = useState(false);
  const [dimIndices, setDimIndices] = useState(false);
  const [name, setName] = useState<string | undefined>("A");
  const [nameHint, setNameHint] = useState<string | undefined>(undefined);
  const [accessExpression, setAccessExpression] = useState<string | undefined>(
    undefined,
  );

  const [visitedIndices, setVisitedIndices] = useState<number[]>([]);
  const [traversalTarget, setTraversalTarget] = useState<
    number | undefined
  >(undefined);
  const traversalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextVal = useRef(60);

  const reset = useCallback(() => {
    if (traversalRef.current) clearTimeout(traversalRef.current);
    setData(INITIAL_DATA);
    setActiveIndex(undefined);
    setDisabledElements([]);
    setShowIndex(true);
    setHighlightElements(false);
    setHighlightIndices(false);
    setDimElements(false);
    setDimIndices(false);
    setName("A");
    setNameHint(undefined);
    setAccessExpression(undefined);
    setVisitedIndices([]);
    setTraversalTarget(undefined);
    nextVal.current = 60;
  }, []);

  const push = useCallback(() => {
    setData((prev) => [...prev, nextVal.current]);
    nextVal.current += 10;
    setActiveIndex(undefined);
    setAccessExpression(undefined);
  }, []);

  const pop = useCallback(() => {
    setData((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    setActiveIndex(undefined);
    setAccessExpression(undefined);
  }, []);

  const unshift = useCallback(() => {
    const val = nextVal.current;
    nextVal.current += 10;
    setData((prev) => [val, ...prev]);
    setActiveIndex(undefined);
    setAccessExpression(undefined);
  }, []);

  const shift = useCallback(() => {
    setData((prev) => (prev.length > 1 ? prev.slice(1) : prev));
    setActiveIndex(undefined);
    setAccessExpression(undefined);
  }, []);

  const replaceRandom = useCallback(() => {
    setData((prev) => {
      const idx = Math.floor(Math.random() * prev.length);
      const next = [...prev];
      next[idx] = nextVal.current;
      nextVal.current += 10;
      setActiveIndex(idx);
      setAccessExpression(`A[${idx}]`);
      return next;
    });
  }, []);

  const selectRandom = useCallback(() => {
    setData((prev) => {
      const idx = Math.floor(Math.random() * prev.length);
      setActiveIndex(idx);
      setAccessExpression(`A[${idx}]`);
      setDisabledElements(
        prev.map((_, i) => i).filter((i) => i !== idx),
      );
      return prev;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setActiveIndex(undefined);
    setAccessExpression(undefined);
    setDisabledElements([]);
  }, []);

  const toggleHighlightElements = useCallback(() => {
    setHighlightElements((v) => {
      const next = !v;
      if (next) {
        setHighlightIndices(false);
        setDimIndices(true);
        setDimElements(false);
        setNameHint("(elements)");
      } else {
        setDimIndices(false);
        setNameHint(undefined);
      }
      return next;
    });
  }, []);

  const toggleHighlightIndices = useCallback(() => {
    setHighlightIndices((v) => {
      const next = !v;
      if (next) {
        setHighlightElements(false);
        setDimElements(true);
        setDimIndices(false);
        setNameHint("(indices)");
      } else {
        setDimElements(false);
        setNameHint(undefined);
      }
      return next;
    });
  }, []);

  const runTraversal = useCallback(() => {
    setActiveIndex(undefined);
    setAccessExpression(undefined);
    setDisabledElements([]);
    setHighlightElements(false);
    setHighlightIndices(false);
    setDimElements(false);
    setDimIndices(false);
    setNameHint(undefined);

    const target = Math.floor(Math.random() * data.length);
    setTraversalTarget(target);
    setVisitedIndices([]);

    let step = 0;
    const tick = () => {
      setVisitedIndices((prev) => [...prev, step]);
      setActiveIndex(step);
      if (step === target) return;
      step++;
      traversalRef.current = setTimeout(tick, 500);
    };
    traversalRef.current = setTimeout(tick, 300);
  }, [data.length]);

  const clearTraversal = useCallback(() => {
    if (traversalRef.current) clearTimeout(traversalRef.current);
    setTraversalTarget(undefined);
    setVisitedIndices([]);
    setActiveIndex(undefined);
  }, []);

  const switchToStrings = useCallback(() => {
    setData(["org", "net", "edu", "com", "dev"]);
    nextVal.current = 60;
    setActiveIndex(undefined);
    setAccessExpression(undefined);
    setDisabledElements([]);
  }, []);

  useEffect(() => {
    return () => {
      if (traversalRef.current) clearTimeout(traversalRef.current);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center gap-10 px-4 py-12 sm:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          ArrayStrip Demo
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Interactive showcase of all component states and animations
        </p>
      </div>

      <div className="relative flex min-h-[140px] w-full items-center justify-center">
        <ArrayStrip
          data={data}
          name={name}
          nameHint={nameHint}
          showIndex={showIndex}
          activeIndex={activeIndex}
          accessExpression={accessExpression}
          disabledElements={disabledElements}
          highlightElements={highlightElements}
          highlightIndices={highlightIndices}
          dimElements={dimElements}
          dimIndices={dimIndices}
          visitedIndices={visitedIndices}
          traversalTarget={traversalTarget}
        />
      </div>

      <div className="grid w-full max-w-3xl gap-6">
        <DemoSection title="Array Operations">
          <DemoButton onClick={push} label="push()" hint="Add to end" />
          <DemoButton onClick={pop} label="pop()" hint="Remove last" />
          <DemoButton onClick={unshift} label="unshift()" hint="Add to start" />
          <DemoButton onClick={shift} label="shift()" hint="Remove first" />
          <DemoButton onClick={replaceRandom} label="set()" hint="Replace random" />
        </DemoSection>

        <DemoSection title="Selection">
          <DemoButton onClick={selectRandom} label="Select Random" hint="Highlight one cell" />
          <DemoButton onClick={clearSelection} label="Clear Selection" hint="Reset active" />
        </DemoSection>

        <DemoSection title="Highlights">
          <DemoButton
            onClick={toggleHighlightElements}
            label="Elements"
            hint="Dashed outline"
            active={highlightElements}
          />
          <DemoButton
            onClick={toggleHighlightIndices}
            label="Indices"
            hint="Dashed outline"
            active={highlightIndices}
          />
          <DemoButton
            onClick={() => setShowIndex((v) => !v)}
            label={showIndex ? "Hide Indices" : "Show Indices"}
            hint="Toggle index row"
          />
        </DemoSection>

        <DemoSection title="Traversal">
          <DemoButton onClick={runTraversal} label="Run Traversal" hint="Find random target" />
          <DemoButton onClick={clearTraversal} label="Clear Traversal" hint="Reset" />
        </DemoSection>

        <DemoSection title="Data Type">
          <DemoButton onClick={() => { reset(); }} label="Numbers" hint="[10, 20, 30...]" />
          <DemoButton onClick={switchToStrings} label="Strings" hint='["org", "net"...]' />
        </DemoSection>

        <div className="flex justify-center pt-2">
          <button
            onClick={reset}
            type="button"
            className="rounded-full border border-border bg-background/80 px-6 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:bg-accent/60 active:scale-[0.97]"
          >
            Reset Everything
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function DemoButton({
  onClick,
  label,
  hint,
  active,
}: {
  onClick: () => void;
  label: string;
  hint: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "group flex flex-col items-start rounded-xl border px-3.5 py-2 text-left transition-all duration-200 active:scale-[0.96]",
        active
          ? "border-primary/50 bg-primary/10 shadow-[0_0_10px_hsl(var(--primary)/0.15)]"
          : "border-border/60 bg-background/60 hover:border-border hover:bg-accent/40",
      )}
    >
      <span className="text-sm font-semibold tracking-tight text-foreground">
        {label}
      </span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </button>
  );
}