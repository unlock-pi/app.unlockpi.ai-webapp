"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SettingsSectionId =
  | "account"
  | "appearance"
  | "preferences"
  | "personalization";

// "account" is deliberately excluded — it's the primary section, opens by
// default, and stays under its own independent toggle rather than the
// expand-all/collapse-all control.
const BULK_SECTION_IDS: SettingsSectionId[] = [
  "appearance",
  "preferences",
  "personalization",
];

function isSettingsSectionId(value: string): value is SettingsSectionId {
  return (
    value === "account" ||
    value === "appearance" ||
    value === "preferences" ||
    value === "personalization"
  );
}

type SettingsSectionsContextValue = {
  isOpen: (id: SettingsSectionId) => boolean;
  setOpen: (id: SettingsSectionId, open: boolean) => void;
  expandAll: () => void;
  collapseAll: () => void;
  isAllExpanded: boolean;
};

const SettingsSectionsContext =
  createContext<SettingsSectionsContextValue | null>(null);

export function SettingsSectionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [openMap, setOpenMap] = useState<Record<SettingsSectionId, boolean>>({
    account: true,
    appearance: false,
    preferences: false,
    personalization: false,
  });

  useEffect(() => {
    // Deep-link support: a link like /dashboard/settings#preferences should
    // open and scroll to that section even though it defaults closed —
    // a link is useless if the section it points at stays collapsed.
    const hash = window.location.hash.replace("#", "");
    if (!hash || !isSettingsSectionId(hash)) {
      return;
    }

    // Reading window.location.hash on mount — a one-time read of external
    // browser state, the same shape the codebase already disables this rule
    // for (see settings-form.tsx's next-themes/localStorage reads).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenMap((previous) => ({ ...previous, [hash]: true }));

    // Runs after the state update above has had a chance to expand the
    // panel, so the scroll target's final position is already correct.
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(hash)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const setOpen = useCallback((id: SettingsSectionId, open: boolean) => {
    setOpenMap((previous) => ({ ...previous, [id]: open }));
  }, []);

  const expandAll = useCallback(() => {
    setOpenMap((previous) => {
      const next = { ...previous };
      for (const id of BULK_SECTION_IDS) next[id] = true;
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setOpenMap((previous) => {
      const next = { ...previous };
      for (const id of BULK_SECTION_IDS) next[id] = false;
      return next;
    });
  }, []);

  const isAllExpanded = BULK_SECTION_IDS.every((id) => openMap[id]);

  const value = useMemo<SettingsSectionsContextValue>(
    () => ({
      isOpen: (id) => openMap[id],
      setOpen,
      expandAll,
      collapseAll,
      isAllExpanded,
    }),
    [openMap, setOpen, expandAll, collapseAll, isAllExpanded],
  );

  return (
    <SettingsSectionsContext.Provider value={value}>
      {children}
    </SettingsSectionsContext.Provider>
  );
}

export function useSettingsSections(): SettingsSectionsContextValue {
  const context = useContext(SettingsSectionsContext);
  if (!context) {
    throw new Error(
      "useSettingsSections must be used within a SettingsSectionsProvider",
    );
  }
  return context;
}
