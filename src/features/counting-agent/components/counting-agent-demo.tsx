"use client";

import { useState } from "react";
import { MicIcon, MicOffIcon } from "lucide-react";

import { IconSwap } from "@/components/ui/icon-swap";
import { CountingAgentBoard } from "@/features/counting-agent/components/counting-agent-board";
import { CountingAgentOverlays } from "@/features/counting-agent/components/counting-agent-overlays";
import { useCountingVoiceAgent } from "@/features/counting-agent/hooks/use-counting-voice-agent";
import { COUNTING_AGENT_NAME } from "@/features/counting-agent/lib/counting-identity";
import { cn } from "@/lib/utils";

/**
 * Each entry is a real thing a teacher says, paired with the exact tool
 * sequence the agent should produce for it. Running them without a
 * microphone verifies the board independently of speech recognition.
 */
const SPOKEN_EXAMPLES: Array<{
  said: string;
  calls: Array<[string, Record<string, unknown>]>;
}> = [
  { said: "Show numbers from 1 to 100.", calls: [["set_count", { total: 100 }]] },
  { said: "Show numbers from 1 to 1000.", calls: [["set_count", { total: 1000 }]] },
  {
    said: "Highlight multiples of 5.",
    calls: [
      ["highlight_multiples", { of: 5 }],
      ["traverse_strip", { subset: "highlighted" }],
    ],
  },
  { said: "Also highlight multiples of 10.", calls: [["highlight_multiples", { of: 10 }]] },
  {
    said: "Highlight multiples of 2 and multiples of 5.",
    calls: [
      ["highlight_multiples", { of: 2 }],
      ["highlight_multiples", { of: 5 }],
    ],
  },
  { said: "Traverse the whole list.", calls: [["traverse_strip", { subset: "all" }]] },
  {
    said: "Add up the highlighted multiples.",
    calls: [["traverse_strip", { subset: "highlighted", accumulate: "sum", label: "Sum =" }]],
  },
  {
    said: "Collect all the multiples of 5.",
    calls: [
      ["highlight_multiples", { of: 5 }],
      ["traverse_strip", { subset: "highlighted", accumulate: "list", label: "Collected" }],
    ],
  },
  { said: "Slow down.", calls: [["set_animation_speed", { speed: "slow" }]] },
  { said: "Clear that result.", calls: [["clear_result", {}]] },
  {
    said: "Bring out the highlighted numbers.",
    calls: [
      ["highlight_multiples", { of: 5 }],
      ["extract_highlighted", {}],
    ],
  },
  { said: "Put them back.", calls: [["return_to_strip", {}]] },
  { said: "How many trailing zeros does 945 factorial end with?", calls: [["explain_trailing_zeros", { n: 945 }]] },
  {
    said: "Does 7 to the power 30 divide 200 factorial?",
    calls: [["find_highest_power_dividing_factorial", { n: 200, p: 7, targetExponent: 30 }]],
  },
  { said: "Show them in rows and columns.", calls: [["show_as_grid", {}]] },
  { said: "Go to the next hundred.", calls: [["go_to_next_hundred", {}]] },
  { said: "Go to the third hundred.", calls: [["go_to_hundred_block", { block: 3 }]] },
  { said: "Go back to the strip.", calls: [["show_as_strip", {}]] },
  { said: "Divide by 5.", calls: [["divide_by", { divisor: 5 }]] },
  { said: "Divide by 7.", calls: [["divide_by", { divisor: 7 }]] },
  { said: "Clear the division.", calls: [["clear_division", {}]] },
  { said: "Show the factorial of 6.", calls: [["create_factorial_strip", { n: 6 }]] },
  {
    said: "Show 100 factorial counting down.",
    calls: [["create_factorial_strip", { n: 100, order: "descending" }]],
  },
  { said: "Reverse the order.", calls: [["reverse_order", {}]] },
  { said: "Clear the highlights.", calls: [["clear_highlights", {}]] },
  { said: "Reset.", calls: [["reset_canvas", {}]] },
];

export function CountingAgentDemo() {
  const agent = useCountingVoiceAgent({
    lessonTitle: "Counting — live board",
    initialTotal: 100,
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
            {COUNTING_AGENT_NAME}
          </h1>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            counting voice agent
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
          <IconSwap
            state={agent.isConnected ? "b" : "a"}
            iconA={<MicIcon className="size-4" />}
            iconB={<MicOffIcon className="size-4" />}
          />
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
        <CountingAgentBoard
          view={agent.view}
          onGridPageChange={(page) => void runExample([["go_to_hundred_block", { block: page + 1 }]])}
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
          <CountingAgentOverlays overlays={agent.overlays} onDismiss={agent.dismissOverlay} />

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
