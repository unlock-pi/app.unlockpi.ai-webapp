"use client";

import { useState } from "react";
import { MicIcon, MicOffIcon } from "lucide-react";

import { ArraysAgentBoard } from "@/features/arrays-agent/components/arrays-agent-board";
import { ArraysAgentOverlays } from "@/features/arrays-agent/components/arrays-agent-overlays";
import { useArraysVoiceAgent } from "@/features/arrays-agent/hooks/use-arrays-voice-agent";
import { ARRAYS_AGENT_NAME } from "@/features/arrays-agent/lib/agent-identity";
import { cn } from "@/lib/utils";

/**
 * Each entry is a real thing a teacher says, paired with the exact tool
 * sequence the agent should produce for it. Running them without a microphone
 * is how the board is verified independently of speech recognition.
 */
const SPOKEN_EXAMPLES: Array<{
  said: string;
  calls: Array<[string, Record<string, unknown>]>;
}> = [
  {
    said: "Create an array with 5, 10, 15, 20.",
    calls: [["create_array", { values: [5, 10, 15, 20] }]],
  },
  {
    said: "Now insert 12 at index 2 and show me what happens.",
    calls: [
      ["insert_at_index", { index: 2, value: 12 }],
      [
        "show_explanation",
        {
          title: "Why did the elements shift?",
          content:
            "An array is one contiguous block, so index 2 was already occupied. Every element from index 2 onward copied one slot right to open a gap, then 12 was written into it.",
        },
      ],
    ],
  },
  { said: "Add 5 to the beginning.", calls: [["insert_at_beginning", { value: 5 }]] },
  { said: "Add 60 to the end.", calls: [["insert_at_end", { value: 60 }]] },
  { said: "Insert 35 while keeping it sorted.", calls: [["sorted_insert", { value: 35 }]] },
  { said: "Remove the first element.", calls: [["delete_from_beginning", {}]] },
  { said: "Remove the last element.", calls: [["delete_from_end", {}]] },
  { said: "Delete the element at index 2.", calls: [["delete_at_index", { index: 2 }]] },
  { said: "Remove all occurrences of 20.", calls: [["delete_by_value", { value: 20, all: true }]] },
  { said: "Find 15.", calls: [["linear_search", { target: 15 }]] },
  { said: "Use binary search to find 20.", calls: [["binary_search", { target: 20 }]] },
  { said: "Find every occurrence of 20.", calls: [["find_all_occurrences", { target: 20 }]] },
  { said: "Traverse the array.", calls: [["traverse_array", {}]] },
  { said: "Go through it backwards.", calls: [["traverse_array_reverse", {}]] },
  { said: "What is at index 2?", calls: [["access_array_element", { index: 2 }]] },
  { said: "Change index 1 to 99.", calls: [["update_array_element", { index: 1, value: 99 }]] },
  { said: "Sort this using bubble sort.", calls: [["bubble_sort", { order: "ascending" }]] },
  {
    said: "Show me selection sort step by step.",
    calls: [["selection_sort", { order: "ascending", showSteps: true }]],
  },
  { said: "Use insertion sort.", calls: [["insertion_sort", { order: "ascending" }]] },
  { said: "Use merge sort.", calls: [["merge_sort", { order: "ascending" }]] },
  { said: "Quick sort it, use 5 as the pivot.", calls: [["quick_sort", { pivot_value: 5 }]] },
  { said: "Sort it largest first.", calls: [["bubble_sort", { order: "descending" }]] },
  {
    said: "Compare bubble sort and merge sort.",
    calls: [["compare_algorithms", { algorithms: ["bubble_sort", "merge_sort"] }]],
  },
  { said: "Explain the time complexity of inserting at the front.", calls: [["show_complexity", { operation: "insert_at_beginning" }]] },
  {
    said: "Give me a question for the students.",
    calls: [
      [
        "quiz_student",
        {
          question: "If we insert a value at index 0 of a 6-element array, how many elements move?",
          answer: "All six — every existing element shifts one slot right.",
          choices: ["None", "One", "Six"],
        },
      ],
    ],
  },
  {
    said: "Make a 2 by 3 grid and traverse it.",
    calls: [
      ["create_multidimensional_array", { rows: 2, cols: 3, values: [1, 2, 3, 4, 5, 6] }],
      ["traverse_2d_array", {}],
    ],
  },
  { said: "Highlight indices 1 through 3.", calls: [["highlight_range", { start: 1, end: 3 }]] },
  { said: "Hide the index numbers.", calls: [["show_index", { visible: false }]] },
  { said: "Show the index numbers.", calls: [["show_index", { visible: true }]] },
  { said: "Clear the highlights.", calls: [["reset_canvas", {}]] },
  { said: "Wipe the board.", calls: [["clear_canvas", {}]] },
];

export function ArraysAgentDemo() {
  const agent = useArraysVoiceAgent({
    lessonTitle: "Arrays — live board",
    initialValues: [10, 20, 30, 40],
  });
  const [log, setLog] = useState<Array<{ ok: boolean; text: string }>>([]);

  const runExample = async (calls: Array<[string, Record<string, unknown>]>) => {
    for (const [name, input] of calls) {
      const tool = agent.tools[name as keyof typeof agent.tools] as unknown as {
        execute: (input: unknown, options: unknown) => Promise<{ ok: boolean; summary: string }>;
      };
      const outcome = await tool.execute(input, {});
      setLog((previous) => [{ ok: outcome.ok, text: `${name} — ${outcome.summary}` }, ...previous].slice(0, 12));
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-10 sm:px-8">
      <header className="grid gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {ARRAYS_AGENT_NAME}
          </h1>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            arrays voice agent
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs",
              agent.isConnected
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            {agent.status}
          </span>
        </div>
        {/* <p className="text-sm text-muted-foreground">
          Every button below is a real spoken command and runs the exact tools the voice agent
          would call for it.
        </p> */}
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (agent.isConnected ? agent.disconnect() : void agent.connect())}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
            agent.isConnected
              ? "border border-border bg-background text-foreground hover:bg-muted"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {agent.isConnected ? <MicOffIcon className="size-4" /> : <MicIcon className="size-4" />}
          {agent.isConnected ? "Stop listening" : "Start voice session"}
        </button>
        {agent.lastToolCall ? (
          <span className="font-mono text-xs text-muted-foreground">
            last tool: {agent.lastToolCall}
          </span>
        ) : null}
        {agent.error ? <span className="text-xs text-destructive">{agent.error}</span> : null}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
        <ArraysAgentBoard
          view={agent.view}
          name={agent.agentState.array.name}
          showIndices={agent.agentState.array.showIndices}
        />
        {agent.caption ? (
          <p className="pt-2 text-center text-sm italic text-muted-foreground">
            &ldquo;{agent.caption}&rdquo;
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Spoken commands
          </p>
          <div className="flex flex-wrap gap-2">
            {SPOKEN_EXAMPLES.map((example) => (
              <button
                key={example.said}
                type="button"
                onClick={() => void runExample(example.calls)}
                className="rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-left text-sm text-foreground transition hover:border-border hover:bg-accent/40 active:scale-[0.98]"
              >
                &ldquo;{example.said}&rdquo;
              </button>
            ))}
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <ArraysAgentOverlays overlays={agent.overlays} onDismiss={agent.dismissOverlay} />

          <div className="grid gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Tool results
            </p>
            {log.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing run yet.</p>
            ) : (
              log.map((entry, index) => (
                <p
                  key={`${index}-${entry.text}`}
                  className={cn(
                    "rounded-lg px-2 py-1 text-xs leading-relaxed",
                    entry.ok
                      ? "bg-muted/50 text-muted-foreground"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {entry.text}
                </p>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
