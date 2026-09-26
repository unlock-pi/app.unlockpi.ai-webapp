import { frame } from "@/features/topologies/lib/topology-frames";
import { emptyScene } from "@/features/topologies/lib/topology-types";
import type { TopologyOpResult } from "@/features/topologies/lib/topology-types";

export function clearScene(): TopologyOpResult {
  const scene = emptyScene();
  return {
    scene,
    frames: [frame(scene, "Cleared the board.")],
    summary: "Cleared the board. It is now empty.",
  };
}
