"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { LinkKind } from "@/features/topologies/lib/topology-kit";
import type { TopologyFrame } from "@/features/topologies/lib/topology-types";

/**
 * The manual, mouse-driven counterpart to the agent's voice tools — wired to
 * the exact same operations, so a drag or a click and a spoken command never
 * disagree about what "moving a device" means. Present only while Mesh is
 * actively driving the block; a static (unconnected) board renders without
 * these and is read-only.
 */
export type TopologyAgentViewActions = {
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onConnect: (a: string, b: string, kind: LinkKind) => void;
  onDisconnect: (a: string, b: string) => void;
  onSetLinkKind: (a: string, b: string, kind: LinkKind) => void;
  onAddDevice: (type: string, x: number, y: number) => void;
  onRename: (id: string, label: string) => void;
};

type TopologyAgentViewValue = {
  /** Canvas block the agent is currently driving, or null when it drives none. */
  blockId: string | null;
  view: TopologyFrame | null;
  /** True while a beat animation is playing, so a step caption can show. */
  isAnimating: boolean;
  /** True while the continuous "data is flowing" toggle is on. */
  packetsAnimating: boolean;
  actions: TopologyAgentViewActions | null;
};

const EMPTY: TopologyAgentViewValue = {
  blockId: null,
  view: null,
  isAnimating: false,
  packetsAnimating: false,
  actions: null,
};

const TopologyAgentViewContext = createContext<TopologyAgentViewValue>(EMPTY);

/**
 * Broadcasts the agent's live animation beat — and, unlike the Arrays/Counting
 * agents this pattern is copied from, a set of direct-manipulation callbacks
 * — to whichever canvas block Mesh is driving. Not writing every beat into
 * the canvas document keeps the document as the record of what the topology
 * IS, with the live board as a transient overlay on top of it.
 */
export function TopologyAgentViewProvider({
  blockId,
  view,
  isAnimating,
  packetsAnimating,
  actions,
  children,
}: TopologyAgentViewValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ blockId, view, isAnimating, packetsAnimating, actions }),
    [blockId, view, isAnimating, packetsAnimating, actions],
  );
  return <TopologyAgentViewContext.Provider value={value}>{children}</TopologyAgentViewContext.Provider>;
}

/** The agent's current beat (and manual-edit callbacks) for one block, or null when Mesh is not driving it. */
export function useTopologyAgentView(blockId: string) {
  const context = useContext(TopologyAgentViewContext);
  return context.blockId === blockId && context.view
    ? {
        view: context.view,
        isAnimating: context.isAnimating,
        packetsAnimating: context.packetsAnimating,
        actions: context.actions,
      }
    : null;
}
