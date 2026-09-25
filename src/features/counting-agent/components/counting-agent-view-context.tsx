"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { CountingFrame } from "@/features/counting-agent/lib/counting-types";

type CountingAgentViewValue = {
  /** Canvas block the agent is currently driving, or null when it drives none. */
  blockId: string | null;
  view: CountingFrame | null;
  /** True while an animation is playing, so the step caption can show. */
  isAnimating: boolean;
};

const EMPTY: CountingAgentViewValue = {
  blockId: null,
  view: null,
  isAnimating: false,
};

const CountingAgentViewContext = createContext<CountingAgentViewValue>(EMPTY);

/**
 * Broadcasts the counting agent's live animation beat to whichever canvas
 * block it is driving. Mirrors `ArraysAgentViewProvider` — see it for the
 * rationale (the document stays the record of what the strip IS, and the
 * animation is a transient overlay on top of it).
 */
export function CountingAgentViewProvider({
  blockId,
  view,
  isAnimating,
  children,
}: CountingAgentViewValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ blockId, view, isAnimating }),
    [blockId, view, isAnimating],
  );

  return (
    <CountingAgentViewContext.Provider value={value}>
      {children}
    </CountingAgentViewContext.Provider>
  );
}

/**
 * The agent's current beat for one block, or null when the agent is not
 * driving it — in which case the block renders from its own authored props.
 */
export function useCountingAgentView(blockId: string) {
  const context = useContext(CountingAgentViewContext);
  return context.blockId === blockId && context.view
    ? { view: context.view, isAnimating: context.isAnimating }
    : null;
}
