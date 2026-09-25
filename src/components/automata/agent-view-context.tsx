"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Automaton, AutomatonExecution } from "@/components/automata/model";

type AutomataAgentViewValue = {
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
  blockId,
  automaton,
  execution,
  onStep,
  onReset,
  children,
}: AutomataAgentViewValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ blockId, automaton, execution, onStep, onReset }),
    [automaton, blockId, execution, onReset, onStep],
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
