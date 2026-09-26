import { tool } from "ai";
import { z } from "zod";

import { applyPreset, PRESET_NAMES } from "@/features/topologies/operations/topology-preset-ops";
import { commit, type TopologyToolContext } from "@/features/topologies/tools/tool-context";

export function createPresetTools(ctx: TopologyToolContext) {
  return {
    build_topology_preset: tool({
      description:
        "Replace the whole board with one of the six worked examples from the reference topology board. star = 8 " +
        "endpoints on one switch. bus = a shared coax backbone with terminators at each end. ring = each node linked " +
        "to its two neighbours in a loop. mesh = 5 routers each linked to every other. tree = a core router over two " +
        "distribution switches (nested stars). hybrid = a realistic small office — internet edge, firewall, LAN, " +
        "Wi-Fi clients, and a DMZ, already zoned. Use whenever the teacher names a topology directly: 'set up a star " +
        "topology', 'show me a ring network', 'build a mesh network', 'give me the hybrid office example'.",
      inputSchema: z.object({ preset: z.enum(PRESET_NAMES) }),
      execute: async ({ preset }) => commit(ctx, applyPreset(preset)),
    }),
  };
}
