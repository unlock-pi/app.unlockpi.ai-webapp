"use client";

import { LayoutGridIcon, ListIcon } from "lucide-react";

import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";

export type CanvasViewMode = "grid" | "list";

type CanvasViewToggleProps = {
  value: CanvasViewMode;
  onChange: (mode: CanvasViewMode) => void;
};

/** Icon-only layout switcher. Controlled, so it always sits next to the list
 * it actually controls rather than owning state of its own. */
export function CanvasViewToggle({ value, onChange }: CanvasViewToggleProps) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as CanvasViewMode)}>
      <TabsList aria-label="Canvas layout">
        <TabsTab value="grid" aria-label="Box layout">
          <LayoutGridIcon className="size-4" />
        </TabsTab>
        <TabsTab value="list" aria-label="List layout">
          <ListIcon className="size-4" />
        </TabsTab>
      </TabsList>
    </Tabs>
  );
}
