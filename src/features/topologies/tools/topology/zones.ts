import { tool } from "ai";
import { z } from "zod";

import { addZone, removeZone, resizeZone } from "@/features/topologies/operations/topology-zone-ops";
import { ZONE_KINDS } from "@/features/topologies/lib/topology-frames";
import { commit, type TopologyToolContext } from "@/features/topologies/tools/tool-context";

const zoneTypeSchema = z
  .enum(ZONE_KINDS)
  .describe("lan = trusted internal network, dmz = public-facing servers, wan = outside/internet edge, mgmt = management segment.");

export function createZoneTools(ctx: TopologyToolContext) {
  return {
    add_zone: tool({
      description:
        "Draw a trust-boundary rectangle on the floor, grouping the devices inside it. Use for 'mark this as the DMZ', " +
        "'put a LAN zone around these', 'add a management zone here'.",
      inputSchema: z.object({
        type: zoneTypeSchema,
        x: z.number().min(0).max(20).describe("Left edge, in grid units."),
        y: z.number().min(0).max(20).describe("Top edge, in grid units."),
        w: z.number().min(1).max(20).describe("Width, in grid units."),
        d: z.number().min(1).max(20).describe("Depth, in grid units."),
        label: z.string().optional().describe("Caption shown on the zone. Defaults to its type."),
      }),
      execute: async ({ type, x, y, w, d, label }) => commit(ctx, addZone(ctx.state.scene, { type, x, y, w, d, label })),
    }),

    remove_zone: tool({
      description: "Remove a zone rectangle. The devices inside it stay on the board. Use for 'remove the DMZ zone'.",
      inputSchema: z.object({ label: z.string().describe("The zone's label (e.g. 'DMZ', 'LAN').") }),
      execute: async ({ label }) => commit(ctx, removeZone(ctx.state.scene, { label })),
    }),

    resize_zone: tool({
      description: "Reposition, resize, or relabel an existing zone. Only the fields given are changed.",
      inputSchema: z.object({
        label: z.string().describe("The zone's current label."),
        x: z.number().min(0).max(20).optional(),
        y: z.number().min(0).max(20).optional(),
        w: z.number().min(1).max(20).optional(),
        d: z.number().min(1).max(20).optional(),
        newLabel: z.string().optional(),
      }),
      execute: async ({ label, x, y, w, d, newLabel }) =>
        commit(ctx, resizeZone(ctx.state.scene, { label, x, y, w, d, newLabel })),
    }),
  };
}
