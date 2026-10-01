"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { PDA, PDAExecution } from "../../../apps/web/src/features/pda/model-agent";

type PDAAgentViewValue = {
  blockId: string | null;
  pda: PDA | null;
  execution: PDAExecution | null;
  onStep?: () => void;
  onRun?: () => void;
  onReset?: () => void;
  onCreate?: (pda: PDA, input: string) => void;
};

const EMPTY: PDAAgentViewValue = {
  blockId: null,
  pda: null,
  execution: null,
};

const PDAAgentViewContext = createContext<PDAAgentViewValue>(EMPTY);

export function PDAAgentViewProvider({ children, ...value }: PDAAgentViewValue & {
  children: ReactNode;
}) {
  return <PDAAgentViewContext.Provider value={value}>{children}</PDAAgentViewContext.Provider>;
}

export function usePDAAgentView(blockId?: string) {
  const context = useContext(PDAAgentViewContext);
  return blockId && context.blockId === blockId && context.pda && context.execution
    ? context
    : null;
}
