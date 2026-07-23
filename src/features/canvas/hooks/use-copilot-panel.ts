"use client";

import { useCallback, useState } from "react";

import type {
  CopilotPanelItem,
  PanelItemType,
} from "@/features/canvas/lib/panel-generation";

/**
 * Holds the stack of things the Copilot has put on the side panel during class.
 * Items are nav-independent — they live for the whole session, so navigating
 * frames never destroys in-progress generation. Newest item is first.
 */
export function useCopilotPanel() {
  const [items, setItems] = useState<CopilotPanelItem[]>([]);

  /** Drop a skeleton in immediately; returns its id so we can resolve it. */
  const addPending = useCallback((type: PanelItemType, topic: string) => {
    const id = crypto.randomUUID();
    setItems((previous) => [
      { id, type, topic, status: "pending", createdAt: Date.now() },
      ...previous,
    ]);
    return id;
  }, []);

  const resolve = useCallback(
    (id: string, patch: Partial<CopilotPanelItem>) => {
      setItems((previous) =>
        previous.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return { items, addPending, resolve, remove, clear };
}
