"use client";

import { ChevronsDownUpIcon, ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSettingsSections } from "@/features/settings/components/settings-sections-context";

/** Expands/collapses every section except Account, which stays under its
 * own independent toggle (see settings-sections-context.tsx). */
export function SettingsExpandToggle() {
  const { isAllExpanded, expandAll, collapseAll } = useSettingsSections();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={isAllExpanded ? collapseAll : expandAll}
    >
      {isAllExpanded ? (
        <>
          <ChevronsDownUpIcon className="size-4" />
          Collapse all
        </>
      ) : (
        <>
          <ChevronsUpDownIcon className="size-4" />
          Expand all
        </>
      )}
    </Button>
  );
}
