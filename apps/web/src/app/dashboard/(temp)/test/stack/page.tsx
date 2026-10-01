"use client";

import { useCallback, useState } from "react";

import { ArrayStrip } from "@/components/data-structure/array-strip";
import { StackStrip } from "@/components/data-structure/stack-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

// Playground for the data-structure visualizers. Two purposes:
//   1) Give the user knobs to drive push/pop and toggle fixed/dynamic so the
//      animations can be exercised without wiring up a full lesson flow.
//   2) Serve as the reference for how a parent should manage stack state
//      when using StackStrip in Fixed mode (guard pushes against the size).

export default function Page() {
  return (
    <div className="@container/main min-h-screen flex flex-1 flex-col gap-10 p-6">
      {/* <ArraySection /> */}
      <StackPlayground />
    </div>
  );
}

function ArraySection() {
  const [arrayData, setArrayData] = useState([1, 2, 3, 4, 5]);
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Array</h2>
      <ArrayStrip
        data={arrayData}
        highlightElements
        highlightIndices
        activeIndex={2}
      />
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setArrayData((prev) => prev.slice(0, Math.max(prev.length - 1, 0)))
          }
        >
          pop
        </Button>
        <Button
          size="sm"
          onClick={() => setArrayData((prev) => [...prev, prev.length + 1])}
        >
          push
        </Button>
      </div>
    </section>
  );
}

function StackPlayground() {
  const [stackData, setStackData] = useState<string[]>([
    "dress 1",
    "dress 2",
    "dress 3",
  ]);
  const [isFixed, setIsFixed] = useState(true);
  const [stackSize, setStackSize] = useState(5);
  // Monotonic counter so successive pushes always give a fresh, human-
  // readable label ("dress 4", "dress 5", …) even after pops.
  const [pushCounter, setPushCounter] = useState(4);

  const isFull = isFixed && stackData.length >= stackSize;
  const isEmpty = stackData.length === 0;

  const push = useCallback(() => {
    if (isFull) return;
    setStackData((prev) => [...prev, `dress ${pushCounter}`]);
    setPushCounter((n) => n + 1);
  }, [isFull, pushCounter]);

  const pop = useCallback(() => {
    setStackData((prev) => (prev.length ? prev.slice(0, -1) : prev));
  }, []);

  const clear = useCallback(() => {
    setStackData([]);
  }, []);

  const handleFixedChange = useCallback(
    (nextChecked: boolean) => {
      setIsFixed(nextChecked);
      // Flipping into Fixed with an over-sized dataset: trim to the current
      // stackSize so the visual matches the invariant.
      if (nextChecked && stackData.length > stackSize) {
        setStackData((prev) => prev.slice(0, stackSize));
      }
    },
    [stackData.length, stackSize],
  );

  const handleSizeChange = useCallback((value: number | readonly number[]) => {
    const nextSize = Array.isArray(value) ? value[0] : (value as number);
    setStackSize(nextSize);
    // Same reason as above: shrinking the bucket must not leave items
    // floating above the walls.
    setStackData((prev) =>
      prev.length > nextSize ? prev.slice(0, nextSize) : prev,
    );
  }, []);

  return (
    <section className="space-y-6  flex justify-between max-w-4xl mx-auto gap-20">
      <div>
        <StackStrip
          data={stackData}
          name="S"
          isFixed={isFixed}
          stackSize={stackSize}
        />
        {isFull ? (
          <p className="text-xs text-muted-foreground">
            Stack is full. Pop an item or increase the size to push more.
          </p>
        ) : null}
      </div>

      {/* Controls */}
      <div className="grid gap-6 max-w-96 rounded-2xl border border-border bg-card p-5 md:grid-cols-[1fr_auto] md:items-start">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Stack</h2>
            <Badge variant={isFixed ? "outline" : "secondary"}>
              {isFixed ? `Fixed · ${stackData.length}/${stackSize}` : "Dynamic"}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="fixed-toggle"
              checked={isFixed}
              onCheckedChange={handleFixedChange}
            />
            <Label htmlFor="fixed-toggle">Fixed size</Label>
            <span className="text-xs text-muted-foreground">
              {isFixed
                ? "Bucket has a set capacity; empty slots stay visible."
                : "Bucket grows and shrinks with the data."}
            </span>
          </div>

          {isFixed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="stack-size">Stack size</Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {stackSize}
                </span>
              </div>
              <Slider
                id="stack-size"
                min={1}
                max={10}
                step={1}
                value={[stackSize]}
                onValueChange={handleSizeChange}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
          <Button onClick={push} disabled={isFull}>
            Push
          </Button>
          <Button variant="outline" onClick={pop} disabled={isEmpty}>
            Pop
          </Button>
          <Button variant="ghost" onClick={clear} disabled={isEmpty}>
            Clear
          </Button>
        </div>
      </div>
    </section>
  );
}
