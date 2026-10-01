"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  Shuffle,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkedListStrip } from "@/components/data-structure/linked-list-strip";

const INITIAL_NODES = ["head", "middle", "tail"];

export default function Page() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
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

  const addNode = useCallback(
    (atStart: boolean) => {
      const nextValue = value.trim() || `node ${nodes.length + 1}`;
      setNodes((current) =>
        atStart ? [nextValue, ...current] : [...current, nextValue],
      );
      setValue("");
      clearTraversal();
    },
    [clearTraversal, nodes.length, value],
  );

  const removeNode = useCallback(
    (atStart: boolean) => {
      setNodes((current) =>
        atStart ? current.slice(1) : current.slice(0, -1),
      );
      clearTraversal();
    },
    [clearTraversal],
  );

  const reverse = useCallback(() => {
    setNodes((current) => [...current].reverse());
    clearTraversal();
  }, [clearTraversal]);

  const reset = useCallback(() => {
    setNodes(INITIAL_NODES);
    setValue("");
    clearTraversal();
  }, [clearTraversal]);

  const traverse = useCallback(() => {
    clearTraversal();
    if (!nodes.length) return;

    let index = 0;
    setTraversalTarget(nodes.length - 1);
    const visitNext = () => {
      setActiveIndex(index);
      setVisitedIndices((current) => [...current, index]);
      if (index < nodes.length - 1) {
        index += 1;
        traversalRef.current = setTimeout(visitNext, 500);
      }
    };
    traversalRef.current = setTimeout(visitNext, 250);
  }, [clearTraversal, nodes.length]);

  useEffect(() => () => clearTraversal(), [clearTraversal]);

  return (
    <main className="@container/main min-h-screen flex-1 px-5 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Data structures / playground
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Linked list
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Follow each pointer as you add, remove, and traverse nodes.
            </p>
          </div>
          <Badge variant="outline" className="gap-2 px-3 py-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            {nodes.length} {nodes.length === 1 ? "node" : "nodes"}
          </Badge>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="flex min-h-104 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Structure
                </p>
                <h2 className="mt-1 text-xl font-semibold">L = nodes</h2>
              </div>
              {traversalTarget !== undefined ? (
                <Badge variant="secondary">Traversing</Badge>
              ) : null}
            </div>

            <div className="my-12 overflow-x-auto pb-4">
              {nodes.length ? (
                <LinkedListStrip
                  nodes={nodes.map((node) => ({ value: node }))}
                  activeIndex={activeIndex}
                  visitedIndices={visitedIndices}
                  traversalTarget={traversalTarget}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  The list is empty. Add a node to begin.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-primary" />
              <span>Head</span>
              <ChevronRight className="size-3" />
              <span>Each node points to the next</span>
              <ChevronRight className="size-3" />
              <span>Null</span>
            </div>
          </section>

          <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Operations
              </p>
              <h2 className="mt-1 text-xl font-semibold">Modify the list</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="node-value" className="text-sm font-medium">
                  New node value
                </label>
                <Input
                  id="node-value"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addNode(false);
                  }}
                  placeholder={`node ${nodes.length + 1}`}
                />
              </div>

              <div className="grid gap-2">
                <Button onClick={() => addNode(false)}>
                  <ArrowDownToLine />
                  Add to tail
                </Button>
                <Button variant="outline" onClick={() => addNode(true)}>
                  <ArrowUpToLine />
                  Add to head
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  onClick={() => removeNode(true)}
                  disabled={!nodes.length}
                >
                  <Minus />
                  Remove head
                </Button>
                <Button
                  variant="outline"
                  onClick={() => removeNode(false)}
                  disabled={!nodes.length}
                >
                  <Plus />
                  Remove tail
                </Button>
              </div>

              <div className="grid gap-2 border-t border-border pt-4">
                <Button variant="secondary" onClick={traverse} disabled={!nodes.length}>
                  <Shuffle />
                  Traverse list
                </Button>
                <Button variant="ghost" onClick={reverse} disabled={nodes.length < 2}>
                  <RotateCcw />
                  Reverse pointers
                </Button>
                <Button variant="ghost" onClick={reset}>
                  <Trash2 />
                  Reset demo
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
