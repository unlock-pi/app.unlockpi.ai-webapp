import { tool } from "ai";
import { z } from "zod";

import { connectDevices, disconnectDevices } from "@/features/topologies/operations/topology-connection-ops";
import { CONNECTION_KINDS } from "@/features/topologies/lib/topology-frames";
import { commit, fail, report, type TopologyToolContext } from "@/features/topologies/tools/tool-context";

const connectionKindSchema = z
  .enum(CONNECTION_KINDS)
  .describe(
    "ethernet = the default copper LAN cable, fiber = a fiber-optic link, wan = an ISP/internet uplink, " +
      "coax = a shared bus backbone, wireless = no physical cable (drawn as traveling dots).",
  );

export function createConnectionTools(ctx: TopologyToolContext) {
  return {
    connect_devices: tool({
      description:
        "Wire two devices together. Use for 'connect the PC to the switch', 'link the router to the firewall with fiber', " +
        "'wire these up over Wi-Fi'. Defaults to an Ethernet cable if no kind is named.",
      inputSchema: z.object({
        a: z.string().describe("First device's id or label."),
        b: z.string().describe("Second device's id or label."),
        kind: connectionKindSchema.optional().describe("Defaults to ethernet if omitted."),
        label: z.string().optional().describe("Optional caption drawn on the link."),
      }),
      execute: async ({ a, b, kind, label }) =>
        commit(ctx, connectDevices(ctx.state.scene, { a, b, kind: kind ?? "ethernet", label })),
    }),

    disconnect_devices: tool({
      description: "Remove the link between two devices. Use for 'disconnect the printer', 'unplug that cable'.",
      inputSchema: z.object({
        a: z.string().describe("First device's id or label."),
        b: z.string().describe("Second device's id or label."),
      }),
      execute: async ({ a, b }) => commit(ctx, disconnectDevices(ctx.state.scene, { a, b })),
    }),

    start_packet_animation: tool({
      description:
        "Start a continuous animation of packets traveling along every link on the board — the same 'Moving packets' " +
        "toggle the reference board has. Use for 'show the network working', 'animate the traffic', 'show packets moving'.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!ctx.state.scene.links.length) return fail(ctx, "There are no links to animate yet.");
        ctx.patch({ packetsAnimating: true });
        return report(ctx, "Started animating packets across every link.");
      },
    }),

    stop_packet_animation: tool({
      description: "Stop the packet animation. Use for 'stop the animation', 'freeze it', 'turn off the packets'.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.patch({ packetsAnimating: false });
        return report(ctx, "Stopped the packet animation.");
      },
    }),
  };
}
