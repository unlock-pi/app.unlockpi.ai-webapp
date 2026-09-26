"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { TopologyFrame } from "@/features/topologies/lib/topology-types";

type TopologyAgentViewValue = {
  /** Canvas block the agent is currently driving, or null when it drives none. */
  blockId: string | null;
  view: TopologyFrame | null;
  /** True while an animation is playing, so a step caption can show. */
  isAnimating: boolean;
};

const EMPTY: TopologyAgentViewValue = { blockId: null, view: null, isAnimating: false };

const TopologyAgentViewContext = createContext<TopologyAgentViewValue>(EMPTY);

/**
 * Broadcasts the agent's live animation beat to whichever canvas block it is
 * driving — the same pattern as the Arrays agent's view context. Not yet
 * wired to a canvas block type; a standalone board (see topology-agent-demo)
 * renders straight from the hook instead of through this context.
 */
export function TopologyAgentViewProvider({
  blockId,
  view,
  isAnimating,
  children,
}: TopologyAgentViewValue & { children: ReactNode }) {
  const value = useMemo(() => ({ blockId, view, isAnimating }), [blockId, view, isAnimating]);
  return <TopologyAgentViewContext.Provider value={value}>{children}</TopologyAgentViewContext.Provider>;
}

/** The agent's current beat for one block, or null when the agent is not driving it. */
export function useTopologyAgentView(blockId: string) {
  const context = useContext(TopologyAgentViewContext);
  return context.blockId === blockId && context.view
    ? { view: context.view, isAnimating: context.isAnimating }
    : null;
}
