import { tool } from "ai";
import { z } from "zod";

import { findNode, nodeError } from "@/features/topologies/lib/topology-frames";
import { fail, report, type TopologyToolContext } from "@/features/topologies/tools/tool-context";

export function createViewTools(ctx: TopologyToolContext) {
  return {
    select_device: tool({
      description: "Spotlight one device without changing anything about it. Use for 'select the router', 'point at PC-1'.",
      inputSchema: z.object({ id: z.string().describe("The device's id or label.") }),
      execute: async ({ id }) => {
        const error = nodeError(ctx.state.scene, id);
        if (error) return fail(ctx, error);
        const found = findNode(ctx.state.scene, id)!;
        ctx.patch({ selected: found.id });
        return report(ctx, `Selected ${found.label ?? found.type}.`);
      },
    }),

    describe_topology: tool({
      description:
        "Describe what is currently on the board — devices, links, and zones. Use only if LIVE CONTEXT seems out of date; " +
        "otherwise read the board straight from LIVE CONTEXT without calling this.",
      inputSchema: z.object({}),
      execute: async () => {
        const { scene } = ctx.state;
        if (scene.nodes.length === 0) return report(ctx, "The board is empty.");

        const devices = scene.nodes.map((n) => `${n.label ?? n.type} (${n.type})`).join(", ");
        const links = scene.links.length
          ? scene.links
              .map((link) => {
                const a = scene.nodes.find((n) => n.id === link.a);
                const b = scene.nodes.find((n) => n.id === link.b);
                return `${a?.label ?? a?.type ?? "?"} — ${b?.label ?? b?.type ?? "?"} (${link.kind})`;
              })
              .join("; ")
          : "none";
        const zones = scene.zones?.length
          ? scene.zones.map((z) => `${z.label ?? z.type} (${z.type})`).join(", ")
          : "none";

        return report(ctx, `Devices: ${devices}. Links: ${links}. Zones: ${zones}.`);
      },
    }),

    show_explanation: tool({
      description: "Show a short written explanation card beside the board. Use when asked to explain a concept in more depth than speech alone.",
      inputSchema: z.object({
        title: z.string(),
        content: z.string().describe("A few sentences, plain language."),
      }),
      execute: async ({ title, content }) => {
        ctx.overlay({ kind: "explanation", title, content });
        return report(ctx, `Showed an explanation: ${title}.`);
      },
    }),

    show_legend: tool({
      description: "Show a legend card of link or zone types beside the board. Use for 'what do the colors mean', 'show the legend'.",
      inputSchema: z.object({
        title: z.string(),
        items: z.array(z.object({ label: z.string(), description: z.string() })).min(1).max(8),
      }),
      execute: async ({ title, items }) => {
        ctx.overlay({ kind: "legend", title, items });
        return report(ctx, `Showed the legend: ${title}.`);
      },
    }),

    quiz_student: tool({
      description: "Ask the class a question about the topology on screen, with the answer hidden until revealed.",
      inputSchema: z.object({
        question: z.string(),
        answer: z.string(),
        choices: z.array(z.string()).min(2).max(6).optional(),
      }),
      execute: async ({ question, answer, choices }) => {
        ctx.overlay({ kind: "quiz", question, answer, choices });
        return report(ctx, "Asked the class a question.");
      },
    }),

    reset_board: tool({
      description: "Clear the current selection and any explanation cards, keeping the diagram as-is. Use for 'clear the highlights'.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.resetCanvas();
        return report(ctx, "Cleared the selection.");
      },
    }),

    clear_topology: tool({
      description: "Remove every device, link, and zone from the board. Use for 'clear the board', 'start over', 'wipe the topology'.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.clearCanvas();
        return report(ctx, "Cleared the board. It is now empty.");
      },
    }),
  };
}
