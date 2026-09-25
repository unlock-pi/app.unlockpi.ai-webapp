"use client";

import { useMemo, useState } from "react";

import {
  createBusTopology,
  createFullDuplex,
  createHalfDuplex,
  createMeshTopology,
  createRingTopology,
  createSimplex,
  createStarTopology,
  DataStream,
  Mainframe,
  Monitor,
  NetworkScene,
  repeatDevice,
  type NetworkDiagram,
} from "@/components/network-isometric";
import { cn } from "@/lib/utils";

type DemoId =
  | "simplex"
  | "half-duplex-1"
  | "half-duplex-2"
  | "full-duplex"
  | "star"
  | "mesh"
  | "bus"
  | "ring";

const DEMOS: { id: DemoId; label: string; group: "Transmission mode" | "Topology" }[] = [
  { id: "simplex", label: "Simplex", group: "Transmission mode" },
  { id: "half-duplex-1", label: "Half-Duplex (Time 1)", group: "Transmission mode" },
  { id: "half-duplex-2", label: "Half-Duplex (Time 2)", group: "Transmission mode" },
  { id: "full-duplex", label: "Full-Duplex", group: "Transmission mode" },
  { id: "star", label: "Star (6 computers)", group: "Topology" },
  { id: "mesh", label: "Mesh (5 laptops)", group: "Topology" },
  { id: "bus", label: "Bus (4 devices)", group: "Topology" },
  { id: "ring", label: "Ring (5 devices)", group: "Topology" },
];

function buildDemo(id: DemoId): NetworkDiagram {
  switch (id) {
    case "simplex":
      return createSimplex(Mainframe({ label: "Mainframe" }), Monitor({ label: "Monitor" }));
    case "half-duplex-1":
      return createHalfDuplex({ type: "desktop", label: "Station A" }, { type: "desktop", label: "Station B" }, 1);
    case "half-duplex-2":
      return createHalfDuplex({ type: "desktop", label: "Station A" }, { type: "desktop", label: "Station B" }, 2);
    case "full-duplex":
      return createFullDuplex({ type: "desktop", label: "Station A" }, { type: "desktop", label: "Station B" });
    case "star":
      return createStarTopology(repeatDevice("desktop", 6, "PC"));
    case "mesh":
      return createMeshTopology(repeatDevice("laptop", 5, "Laptop"));
    case "bus":
      return createBusTopology(repeatDevice("desktop", 4, "PC"));
    case "ring":
      return createRingTopology(repeatDevice("server", 5, "Node"));
  }
}

export default function NetworkIsometricDemoPage() {
  const [demo, setDemo] = useState<DemoId>("star");
  const [streaming, setStreaming] = useState(0);

  const diagram = useMemo(() => {
    const built = buildDemo(demo);
    // Show DataStream on a topology's first connection so the "continuous
    // flow" primitive has something to demonstrate in every demo, not just a
    // dedicated one.
    if (built.connections[0]) DataStream(built.connections[0], streaming);
    return built;
  }, [demo, streaming]);

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Networking construction kit</h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          One isometric component library (13 devices, 5 cable types, direction markers, data objects)
          assembled by topology-builder functions — nothing here is a hand-drawn diagram.
        </p>
      </div>

      <div className="h-[440px] w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-slate-950">
        <NetworkScene diagram={diagram} />
      </div>

      <div className="flex w-full max-w-3xl flex-col items-center gap-3">
        <label className="flex w-full max-w-xs flex-col gap-1 text-xs text-muted-foreground">
          Data stream progress on first link
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={streaming}
            onChange={(e) => setStreaming(Number(e.target.value))}
          />
        </label>
        {(["Transmission mode", "Topology"] as const).map((group) => (
          <div key={group} className="flex flex-wrap items-center justify-center gap-2">
            {DEMOS.filter((d) => d.group === group).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDemo(d.id)}
                className={cn(
                  "rounded-full border border-border px-3 py-1.5 text-sm font-medium transition-colors",
                  demo === d.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-foreground/5",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
