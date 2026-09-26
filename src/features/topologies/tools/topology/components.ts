import { tool } from "ai";
import { z } from "zod";

import {
  addDevice,
  moveDevice,
  removeDevice,
  renameDevice,
  setDeviceStatus,
} from "@/features/topologies/operations/topology-component-ops";
import { ALL_DEVICE_TYPES } from "@/features/topologies/lib/topology-frames";
import { commit, fail, type TopologyToolContext } from "@/features/topologies/tools/tool-context";

const deviceTypeSchema = z
  .enum(ALL_DEVICE_TYPES)
  .describe(
    "Endpoints: desktop, laptop, phone, printer, iot, user. Network: router, switch, hub, modem, ap, firewall, lb. " +
      "Compute & data: server, rack, storage, db, container, cloud. Scene fixtures: terminator, port.",
  );

export function createComponentTools(ctx: TopologyToolContext) {
  return {
    add_device: tool({
      description:
        "Place one device on the board. Use for 'add a router', 'put a desktop here', 'drop in a firewall'. " +
        "Omit x/y to let it find the next open spot.",
      inputSchema: z.object({
        type: deviceTypeSchema,
        label: z.string().optional().describe("Name shown under the device. Defaults to the device's name."),
        x: z.number().min(0).max(20).optional().describe("Grid column. Omit to auto-place."),
        y: z.number().min(0).max(20).optional().describe("Grid row. Omit to auto-place."),
      }),
      execute: async ({ type, label, x, y }) => commit(ctx, addDevice(ctx.state.scene, { type, label, x, y })),
    }),

    remove_device: tool({
      description:
        "Remove one device and every link to it. Use for 'remove the switch', 'delete PC-2', 'take that off the board'.",
      inputSchema: z.object({
        id: z.string().describe("The device's id or the label shown on the board (e.g. 'Router', 'PC-1')."),
      }),
      execute: async ({ id }) => commit(ctx, removeDevice(ctx.state.scene, { id })),
    }),

    move_device: tool({
      description: "Move a device to a new grid position. Use for 'move the router next to the firewall', 'put it over there'.",
      inputSchema: z.object({
        id: z.string().describe("The device's id or label."),
        x: z.number().min(0).max(20),
        y: z.number().min(0).max(20),
      }),
      execute: async ({ id, x, y }) => commit(ctx, moveDevice(ctx.state.scene, { id, x, y })),
    }),

    rename_device: tool({
      description: "Change the label shown under a device. Use for 'call this one PC-1', 'rename the switch to Core Switch'.",
      inputSchema: z.object({
        id: z.string().describe("The device's id or its current label."),
        label: z.string().min(1).max(40),
      }),
      execute: async ({ id, label }) => commit(ctx, renameDevice(ctx.state.scene, { id, label })),
    }),

    set_device_status: tool({
      description:
        "Mark a device's status as a label suffix (TopoKit's blocks don't have status colors, so this shows as text). " +
        "Use for 'mark the router as down', 'show the server as active', 'this one has an error'.",
      inputSchema: z.object({
        id: z.string().describe("The device's id or label."),
        status: z.enum(["idle", "active", "error", "offline"]),
      }),
      execute: async ({ id, status }) => {
        if (!ctx.state.scene.nodes.length) return fail(ctx, "There is nothing on the board yet.");
        return commit(ctx, setDeviceStatus(ctx.state.scene, { id, status }));
      },
    }),
  };
}
