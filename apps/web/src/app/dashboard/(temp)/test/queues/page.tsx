"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
  Shuffle,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueueStrip } from "@/components/data-structure/queue-strip";

const INITIAL_QUEUE = ["first", "second", "third"];

export default function Page() {
  const [queue, setQueue] = useState(INITIAL_QUEUE);
  const [value, setValue] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [visitedIndices, setVisitedIndices] = useState<number[]>([]);
  const [traversalTarget, setTraversalTarget] = useState<number | undefined>(
    undefined,
  );
  const traversalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTraversal = useCallback(() => {
    if (traversalRef.current) clearTimeout(traversalRef.current);
    setActiveIndex(undefined);
    setVisitedIndices([]);
    setTraversalTarget(undefined);
  }, []);

  const enqueue = useCallback(() => {
    const nextValue = value.trim() || `item ${queue.length + 1}`;
    setQueue((current) => [...current, nextValue]);
    setValue("");
    clearTraversal();
  }, [clearTraversal, queue.length, value]);

  const dequeue = useCallback(() => {
    setQueue((current) => current.slice(1));
    clearTraversal();
  }, [clearTraversal]);

  const traverse = useCallback(() => {
    clearTraversal();
    if (!queue.length) return;

    let index = 0;
    setTraversalTarget(queue.length - 1);
    const visitNext = () => {
      setActiveIndex(index);
      setVisitedIndices((current) => [...current, index]);
      if (index < queue.length - 1) {
        index += 1;
        traversalRef.current = setTimeout(visitNext, 500);
      }
    };
    traversalRef.current = setTimeout(visitNext, 250);
  }, [clearTraversal, queue.length]);

  const reset = useCallback(() => {
    setQueue(INITIAL_QUEUE);
    setValue("");
    clearTraversal();
  }, [clearTraversal]);

  useEffect(() => () => clearTraversal(), [clearTraversal]);

  return (
    <main className="@container/main min-h-screen flex-1 px-5 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Data structures / playground
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Queue</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Add items at the back and remove them from the front, just like a
              real FIFO queue.
            </p>
          </div>
          <Badge variant="outline" className="gap-2 px-3 py-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            {queue.length} {queue.length === 1 ? "item" : "items"}
          </Badge>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="flex min-h-104 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Structure
                </p>
                <h2 className="mt-1 text-xl font-semibold">Q = items</h2>
              </div>
              {traversalTarget !== undefined ? (
                <Badge variant="secondary">Traversing</Badge>
              ) : null}
            </div>

            <div className="my-12 overflow-x-auto pb-4">
              <QueueStrip
                data={queue}
                name="Q"
                activeIndex={activeIndex}
                visitedIndices={visitedIndices}
                traversalTarget={traversalTarget}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-primary" />
              <span>Front leaves first</span>
              <span className="mx-1 text-border">|</span>
              <span>Back receives new items</span>
            </div>
          </section>

          <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Operations
              </p>
              <h2 className="mt-1 text-xl font-semibold">Manage the queue</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="queue-value" className="text-sm font-medium">
                  New item value
                </label>
                <Input
                  id="queue-value"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") enqueue();
                  }}
                  placeholder={`item ${queue.length + 1}`}
                />
              </div>

              <div className="grid gap-2">
                <Button onClick={enqueue}>
                  <ArrowDownToLine />
                  Enqueue at back
                </Button>
                <Button
                  variant="outline"
                  onClick={dequeue}
                  disabled={!queue.length}
                >
                  <ArrowUpFromLine />
                  Dequeue from front
                </Button>
              </div>

              <div className="grid gap-2 border-t border-border pt-4">
                <Button
                  variant="secondary"
                  onClick={traverse}
                  disabled={!queue.length}
                >
                  <Shuffle />
                  Traverse queue
                </Button>
                <Button variant="ghost" onClick={reset}>
                  <RotateCcw />
                  Reset demo
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setQueue([]);
                    clearTraversal();
                  }}
                  disabled={!queue.length}
                >
                  <Trash2 />
                  Clear queue
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
