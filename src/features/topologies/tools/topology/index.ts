import { createComponentTools } from "@/features/topologies/tools/topology/components";
import { createConnectionTools } from "@/features/topologies/tools/topology/connections";
import { createPresetTools } from "@/features/topologies/tools/topology/presets";
import { createViewTools } from "@/features/topologies/tools/topology/view";
import { createZoneTools } from "@/features/topologies/tools/topology/zones";
import type { TopologyToolContext } from "@/features/topologies/tools/tool-context";

/**
 * The agent's whole vocabulary, as an AI SDK ToolSet.
 *
 * It is a factory rather than a constant because every tool closes over the
 * context it acts on — which is what lets the same definitions drive the
 * voice session, a text chat, and the demo page without any of them knowing
 * about the others.
 */
export function createTopologyTools(ctx: TopologyToolContext) {
  return {
    ...createComponentTools(ctx),
    ...createConnectionTools(ctx),
    ...createZoneTools(ctx),
    ...createPresetTools(ctx),
    ...createViewTools(ctx),
  };
}

export type TopologyToolSet = ReturnType<typeof createTopologyTools>;
export type TopologyToolName = keyof TopologyToolSet;
