"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type {
  RegularExpressionDisplayMode,
  RegularExpressionViewState,
} from "@/components/regular-expression/types";

type RegularExpressionAgentViewValue = {
  blockId: string | null;
  state: RegularExpressionViewState | null;
  onStep?: () => void;
  onReset?: () => void;
  onPlaybackComplete?: (executionId: string, stepCount: number) => void;
  onDisplayModeChange?: (mode: RegularExpressionDisplayMode) => void;
};

const EMPTY: RegularExpressionAgentViewValue = {
  blockId: null,
  state: null,
};

const RegularExpressionAgentViewContext =
  createContext<RegularExpressionAgentViewValue>(EMPTY);

/**
 * Future RE tools can publish visual state here without mutating authored Puck
 * props or reaching into the DOM.
 */
export function RegularExpressionAgentViewProvider({
  blockId,
  state,
  onStep,
  onReset,
  onPlaybackComplete,
  onDisplayModeChange,
  children,
}: RegularExpressionAgentViewValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({
      blockId,
      state,
      onStep,
      onReset,
      onPlaybackComplete,
      onDisplayModeChange,
    }),
    [blockId, onDisplayModeChange, onPlaybackComplete, onReset, onStep, state],
  );

  return (
    <RegularExpressionAgentViewContext.Provider value={value}>
      {children}
    </RegularExpressionAgentViewContext.Provider>
  );
}

export function useRegularExpressionAgentView(blockId: string) {
  const context = useContext(RegularExpressionAgentViewContext);
  return context.blockId === blockId && context.state ? context : null;
}
