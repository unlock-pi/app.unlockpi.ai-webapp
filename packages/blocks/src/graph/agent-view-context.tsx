"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type {
  GraphDisplayMode,
  GraphExecutionState,
  GraphViewState,
} from "./types";

type GraphAgentViewValue = {
  blockId: string | null;
  viewState: GraphViewState | null;
  execution: GraphExecutionState | null;
};

const EMPTY: GraphAgentViewValue = {
  blockId: null,
  viewState: null,
  execution: null,
};

const GraphAgentViewContext = createContext<GraphAgentViewValue>(EMPTY);

/**
 * Future algorithm runners can publish visual/execution state here without
 * editing serialized Puck graph data or directly accessing the renderer.
 */
export function GraphAgentViewProvider({
  blockId,
  viewState,
  execution,
  children,
}: GraphAgentViewValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ blockId, viewState, execution }),
    [blockId, execution, viewState],
  );
  return (
    <GraphAgentViewContext.Provider value={value}>
      {children}
    </GraphAgentViewContext.Provider>
  );
}

export function useGraphAgentView(blockId: string) {
  const context = useContext(GraphAgentViewContext);
  return context.blockId === blockId && (context.viewState || context.execution)
    ? context
    : null;
}


type GraphPresentationViewValue = {
  modes: Record<string, GraphDisplayMode>;
  setMode: (blockId: string, mode: GraphDisplayMode) => void;
};

const GraphPresentationViewContext =
  createContext<GraphPresentationViewValue | null>(null);

/**
 * Keeps representation changes local to a live presentation. This state is
 * intentionally not written back into the authored Puck document.
 */
export function GraphPresentationViewProvider({ children }: { children: ReactNode }) {
  const [modes, setModes] = useState<Record<string, GraphDisplayMode>>({});
  const value = useMemo(
    () => ({
      modes,
      setMode: (blockId: string, mode: GraphDisplayMode) =>
        setModes((current) =>
          current[blockId] === mode ? current : { ...current, [blockId]: mode },
        ),
    }),
    [modes],
  );

  return (
    <GraphPresentationViewContext.Provider value={value}>
      {children}
    </GraphPresentationViewContext.Provider>
  );
}

export function useGraphPresentationView(blockId: string) {
  const context = useContext(GraphPresentationViewContext);
  if (!context) return null;
  return {
    mode: context.modes[blockId],
    setMode: (mode: GraphDisplayMode) => context.setMode(blockId, mode),
  };
}
