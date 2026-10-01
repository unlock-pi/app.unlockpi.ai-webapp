"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type {
  Automaton,
  AutomatonExecution,
} from "@/packages/blocks/automata/model";

import type { AutomataConstructionView } from "@/features/automata-agent/construction/automata-construction-agent";

type AutomataAgentViewValue = {
  construction?: AutomataConstructionView | null;
  onConstructionAnimationComplete?: (token: string) => void;
  onConstructionReady?: (automatonId: string) => void;
  onPauseConstruction?: () => void;
  onResumeConstruction?: () => void;
  blockId: string | null;
  automaton: Automaton | null;
  execution: AutomatonExecution | null;
  onStep?: () => void;
  onRun?: () => void;
  onReset?: () => void;
};

const EMPTY: AutomataAgentViewValue = {
  blockId: null,
  automaton: null,
  execution: null,
};

const AutomataAgentViewContext = createContext<AutomataAgentViewValue>(EMPTY);

/** Publishes transient execution separately from the persisted Puck definition. */
export function AutomataAgentViewProvider({
  construction,
  onConstructionAnimationComplete,
  onConstructionReady,
  onPauseConstruction,
  onResumeConstruction,
  blockId,
  automaton,
  execution,
  onStep,
  onRun,
  onReset,
  children,
}: AutomataAgentViewValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({
      blockId,
      automaton,
      execution,
      onStep,
      onRun,
      onReset,
      construction,
      onConstructionAnimationComplete,
      onConstructionReady,
      onPauseConstruction,
      onResumeConstruction,
    }),
    [
      automaton,
      blockId,
      execution,
      onReset,
      onRun,
      onStep,
      construction,
      onConstructionAnimationComplete,
      onConstructionReady,
      onPauseConstruction,
      onResumeConstruction,
    ],
  );
  return (
    <AutomataAgentViewContext.Provider value={value}>
      {children}
    </AutomataAgentViewContext.Provider>
  );
}

export function useAutomataAgentView(blockId: string) {
  const context = useContext(AutomataAgentViewContext);
  if (context.blockId !== blockId || !context.automaton || !context.execution) {
    return null;
  }
  return {
    ...context,
    automaton: context.automaton,
    execution: context.execution,
  };
}
