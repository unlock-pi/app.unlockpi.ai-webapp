"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { useTopologyCanvasBridge } from "@/features/topologies/hooks/use-topology-canvas-bridge";
import { useTopologyVoiceAgent } from "@/features/topologies/hooks/use-topology-voice-agent";
import type { LinkKind } from "@/features/topologies/lib/topology-kit";
import type { TopologyAgentState } from "@/features/topologies/lib/topology-types";
import type { TopologyAgentViewActions } from "@/features/topologies/ui/components/topology-agent-view-context";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";

type Args = {
  canvasId?: string | null;
  canvasTitle?: string;
  responseMode?: "audio" | "silent";
  getDocument: () => CanvasDocument;
  getActiveFrameId: () => string | null;
  applyDocument: (document: CanvasDocument, activeFrameId: string | null) => void;
  /** The frame currently on screen. Changing it re-points the agent. */
  activeFrameId?: string | null;
  /** False while another mode owns the class — Mesh then adopts nothing. */
  enabled?: boolean;
};

/**
 * Mesh, wired to a canvas. Mirrors `useCountingAgentOnCanvas`: the bridge
 * guarantees a block exists to hold the scene and writes it back on every
 * commit; this hook adds the one thing neither Arrays nor Counting needed —
 * a set of direct-manipulation callbacks (`viewProviderProps.actions`) so
 * dragging a device or clicking "Connect" on the rendered board calls the
 * exact same tool `execute` a spoken command would, instead of a second,
 * parallel mutation path.
 */
export function useTopologyAgentOnCanvas({
  canvasId = null,
  canvasTitle,
  responseMode = "audio",
  getDocument,
  getActiveFrameId,
  applyDocument,
  activeFrameId,
  enabled = true,
}: Args) {
  const bridge = useTopologyCanvasBridge({ getDocument, getActiveFrameId, applyDocument });
  const { adoptFrameTopology, blockControls, commitTopologyScene } = bridge;

  const handleCommit = useCallback(
    (state: TopologyAgentState) => {
      if (state.scene.nodes.length === 0) return;
      commitTopologyScene(state.scene);
    },
    [commitTopologyScene],
  );

  const agent = useTopologyVoiceAgent({
    canvasId,
    lessonTitle: canvasTitle,
    responseMode,
    onCommit: handleCommit,
    blocks: blockControls,
  });

  // Re-point Mesh at whatever topology the class is now looking at — same
  // reasoning as the arrays/counting frame-adoption effect.
  const { adoptScene } = agent;
  const adoptedFrameRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled) {
      adoptedFrameRef.current = undefined;
      return;
    }
    const frameId = activeFrameId ?? null;
    if (adoptedFrameRef.current === frameId) return;
    adoptedFrameRef.current = frameId;
    adoptScene(adoptFrameTopology(frameId));
  }, [activeFrameId, adoptFrameTopology, adoptScene, enabled]);

  // Direct-manipulation callbacks, wired to the SAME tool executions a
  // spoken command uses — a drag and "move the router" are one code path.
  const actions = useMemo<TopologyAgentViewActions>(
    () => ({
      onSelect: (id) => void agent.tools.select_device.execute({ id }, {}),
      onMove: (id, x, y) => void agent.tools.move_device.execute({ id, x, y }, {}),
      onConnect: (a, b, kind: LinkKind) => void agent.tools.connect_devices.execute({ a, b, kind }, {}),
      onDisconnect: (a, b) => void agent.tools.disconnect_devices.execute({ a, b }, {}),
      onSetLinkKind: (a, b, kind: LinkKind) => {
        void agent.tools.disconnect_devices.execute({ a, b }, {});
        void agent.tools.connect_devices.execute({ a, b, kind }, {});
      },
      onAddDevice: (type, x, y) => void agent.tools.add_device.execute({ type, x, y }, {}),
      onRename: (id, label) => void agent.tools.rename_device.execute({ id, label }, {}),
    }),
    [agent.tools],
  );

  return {
    agent,
    targetBlockId: bridge.targetBlockId,
    viewProviderProps: {
      blockId: bridge.targetBlockId,
      view: agent.view,
      isAnimating: agent.isAnimating,
      packetsAnimating: agent.agentState.packetsAnimating,
      actions,
    },
  };
}
