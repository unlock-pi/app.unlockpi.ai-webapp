"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Automaton, AutomatonExecution } from "@/components/automata/model";

import type { AutomataConstructionView } from "@/features/automata-agent/construction/automata-construction";

type AutomataAgentViewValue = {
  construction?: AutomataConstructionView | null;
  onConstructionAnimationComplete?: (token: string) => void;
  onPauseConstruction?: () => void;
  onResumeConstruction?: () => void;
  blockId: string | null;
  automaton: Automaton | null;
  execution: AutomatonExecution | null;
  onStep?: () => void;
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
  onPauseConstruction,
  onResumeConstruction,
  blockId,
  automaton,
  execution,
  onStep,
  onReset,
  children,
}: AutomataAgentViewValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ blockId, automaton, execution, onStep, onReset, construction, onConstructionAnimationComplete, onPauseConstruction, onResumeConstruction }),
    [automaton, blockId, execution, onReset, onStep, construction, onConstructionAnimationComplete, onPauseConstruction, onResumeConstruction],
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
