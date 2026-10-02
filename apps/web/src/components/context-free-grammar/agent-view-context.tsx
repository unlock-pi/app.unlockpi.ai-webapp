"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ContextFreeGrammarViewState } from "@/components/context-free-grammar/types";

type GrammarAgentView = {
  blockId: string | null;
  state: ContextFreeGrammarViewState | null;
  onStep?: () => void;
  onReset?: () => void;
  onPlaybackComplete?: (playbackId: string, stepCount: number) => void;
};

const EMPTY: GrammarAgentView = { blockId: null, state: null };
const Context = createContext<GrammarAgentView>(EMPTY);

/** Transient visual control surface; it does not persist data or call an agent. */
export function ContextFreeGrammarAgentViewProvider({ blockId, state, onStep, onReset, onPlaybackComplete, children }: GrammarAgentView & { children: ReactNode }) {
  const value = useMemo(() => ({ blockId, state, onStep, onReset, onPlaybackComplete }), [blockId, state, onStep, onReset, onPlaybackComplete]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useContextFreeGrammarAgentView(blockId: string) {
  const value = useContext(Context);
  return value.blockId === blockId && value.state ? value : null;
}
