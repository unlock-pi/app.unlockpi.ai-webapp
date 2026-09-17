"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { ArrayFrame } from "@/features/arrays-agent/lib/array-types";

type ArraysAgentViewValue = {
  /** Canvas block the agent is currently driving, or null when it drives none. */
  blockId: string | null;
  view: ArrayFrame | null;
  showIndices: boolean;
};

const EMPTY: ArraysAgentViewValue = { blockId: null, view: null, showIndices: true };

const ArraysAgentViewContext = createContext<ArraysAgentViewValue>(EMPTY);

/**
 * Broadcasts the agent's live animation beat to whichever canvas block it is
 * driving.
 *
 * The alternative — writing every beat into the canvas document — would clone
 * the whole document up to a hundred times per sort. This keeps the document
 * as the record of what the array IS, and lets the animation be a transient
 * overlay on top of it.
 */
export function ArraysAgentViewProvider({
  blockId,
  view,
  showIndices,
  children,
}: ArraysAgentViewValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ blockId, view, showIndices }),
    [blockId, view, showIndices],
  );

  return (
    <ArraysAgentViewContext.Provider value={value}>
      {children}
    </ArraysAgentViewContext.Provider>
  );
}

/**
 * The agent's current beat for one block, or null when the agent is not
 * driving it — in which case the block renders from its own authored props.
 */
export function useArraysAgentView(blockId: string) {
  const context = useContext(ArraysAgentViewContext);
  return context.blockId === blockId && context.view
    ? { view: context.view, showIndices: context.showIndices }
    : null;
}
