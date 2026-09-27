"use client";

import { useState } from "react";

import { TopologyAgentBoard } from "@/features/topologies/ui/components/topology-agent-board";
import { TopologyAgentOverlays } from "@/features/topologies/ui/components/topology-agent-overlays";
import { useTopologyVoiceAgent } from "@/features/topologies/hooks/use-topology-voice-agent";
import { TOPOLOGY_AGENT_NAME } from "@/features/topologies/lib/topology-name";
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
    said: "Set up a star topology.",
    calls: [["build_topology_preset", { preset: "star" }]],
  },
  {
    said: "Show me a ring network.",
    calls: [["build_topology_preset", { preset: "ring" }]],
  },
  {
    said: "Build a mesh network.",
    calls: [["build_topology_preset", { preset: "mesh" }]],
  },
  {
    said: "Show me a bus topology.",
    calls: [["build_topology_preset", { preset: "bus" }]],
  },
  {
    said: "Show a tree topology.",
    calls: [["build_topology_preset", { preset: "tree" }]],
  },
  {
    said: "Give me the hybrid office example.",
    calls: [["build_topology_preset", { preset: "hybrid" }]],
  },
  {
    said: "Show the network working.",
    calls: [["start_packet_animation", {}]],
  },
  { said: "Stop the animation.", calls: [["stop_packet_animation", {}]] },
  { said: "Clear the board.", calls: [["clear_topology", {}]] },
  {
    said: "Add a router.",
    calls: [["add_device", { type: "router", label: "Router" }]],
  },
  {
    said: "Add a switch next to it.",
    calls: [["add_device", { type: "switch", label: "Switch", x: 2, y: 0 }]],
  },
  {
    said: "Connect the router to the switch.",
    calls: [["connect_devices", { a: "Router", b: "Switch" }]],
  },
  {
    said: "Add two laptops.",
    calls: [
      ["add_device", { type: "laptop", label: "Laptop 1", x: 0, y: 2 }],
      ["add_device", { type: "laptop", label: "Laptop 2", x: 1, y: 2 }],
    ],
  },
  {
    said: "Connect them to the switch over Wi-Fi.",
    calls: [
      ["connect_devices", { a: "Laptop 1", b: "Switch", kind: "wireless" }],
      ["connect_devices", { a: "Laptop 2", b: "Switch", kind: "wireless" }],
    ],
  },
  {
    said: "Mark the switch as active.",
    calls: [["set_device_status", { id: "Switch", status: "active" }]],
  },
  {
    said: "Put a management zone around the network gear.",
    calls: [
      [
        "add_zone",
        { type: "mgmt", x: -0.5, y: -0.5, w: 4, d: 1.5, label: "Management" },
      ],
    ],
  },
  {
    said: "What's on the board right now?",
    calls: [["describe_topology", {}]],
  },
  {
    said: "Explain why a star topology's switch is a single point of failure.",
    calls: [
      [
        "show_explanation",
        {
          title: "Single point of failure",
          content:
            "Every device in a star only talks to the switch — if the switch goes down, every device loses connectivity at once, even though the devices themselves are fine.",
        },
      ],
    ],
  },
];

export function TopologyAgentDemo() {
  const agent = useTopologyVoiceAgent({
    lessonTitle: "Network topologies — live board",
  });
  const [log, setLog] = useState<Array<{ ok: boolean; text: string }>>([]);

  const runExample = async (
    calls: Array<[string, Record<string, unknown>]>,
  ) => {
    for (const [name, input] of calls) {
      const tool = agent.tools[name as keyof typeof agent.tools] as unknown as {
        execute: (
          input: unknown,
          options: unknown,
        ) => Promise<{ ok: boolean; summary: string }>;
      };
      const outcome = await tool.execute(input, {});
      setLog((previous) =>
        [
          { ok: outcome.ok, text: `${name} — ${outcome.summary}` },
          ...previous,
        ].slice(0, 12),
      );
    }
  };

  const runTool = (name: string, input: Record<string, unknown>) => void runExample([[name, input]]);

  const handleMove = (id: string, x: number, y: number) => runTool("move_device", { id, x, y });
  const handleConnect = (a: string, b: string, kind: string) => runTool("connect_devices", { a, b, kind });
  const handleDisconnect = (a: string, b: string) => runTool("disconnect_devices", { a, b });
  const handleSetLinkKind = (a: string, b: string, kind: string) => {
    runTool("disconnect_devices", { a, b });
    runTool("connect_devices", { a, b, kind });
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-10 sm:px-8">
      <header className="grid gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {TOPOLOGY_AGENT_NAME}
          </h1>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            network topologies voice agent
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
        {agent.lastToolCall ? (
          <span className="font-mono text-xs text-muted-foreground">
            last tool: {agent.lastToolCall}
          </span>
        ) : null}
        {agent.error ? (
          <span className="text-xs text-destructive">{agent.error}</span>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
        <p className="pb-3 text-xs text-muted-foreground">
          Drag a device to move it — every link follows. Use &ldquo;Connect&rdquo; to pick two devices and wire them,
          or click a link to change its kind or delete it.
        </p>
        <TopologyAgentBoard
          scene={agent.view.scene}
          note={agent.view.note}
          packetsAnimating={agent.agentState.packetsAnimating}
          onSelect={agent.selectDevice}
          onMove={handleMove}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onSetLinkKind={handleSetLinkKind}
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
          <TopologyAgentOverlays
            overlays={agent.overlays}
            onDismiss={agent.dismissOverlay}
          />

          <div className="grid gap-1.5 max-h-96 overflow-y-scroll overflow-hidden rounded-lg border border-border/60 bg-background/60 p-3">
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
