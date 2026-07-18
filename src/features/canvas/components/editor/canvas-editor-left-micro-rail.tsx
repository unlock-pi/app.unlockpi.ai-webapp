"use client";

import { Button } from "@/components/ui/button";
import {
  easyModeHiddenLeftPanelViews,
  leftPanelItems,
} from "@/features/canvas/lib/canvas-client-helpers";
import type { CanvasEditorController } from "@/features/canvas/types/canvas-other-types";
import { ScrollArea } from "@/components/ui/scroll-area";

type CanvasEditorLeftMicroRailProps = {
  easyMode: boolean;
  leftPanelView: CanvasEditorController["leftPanelView"];
  actions: Pick<
    CanvasEditorController["actions"],
    "setLeftPanelView" | "setToolPanelOpen"
  >;
};

export function CanvasEditorLeftMicroRail({
  actions,
  easyMode,
  leftPanelView,
}: CanvasEditorLeftMicroRailProps) {
  const visibleItems = easyMode
    ? leftPanelItems.filter(
        (item) => !easyModeHiddenLeftPanelViews.includes(item.id),
      )
    : leftPanelItems;

  return (
    <aside
      aria-label="Tool rail"
      className="flex min-h-0 flex-col border-r border-border bg-muted/20"
    >
      <ScrollArea className="min-h-0 flex-1" scrollFade scrollbarGutter>
        <div className="mt-5 ml-3 grid gap-2 px-2 pb-3">
          {visibleItems.map((item) => (
            <Button
              key={item.id}
              aria-label={item.label}
              size="icon-lg"
              title={item.label}
              variant={leftPanelView === item.id ? "secondary" : "ghost"}
              className="h-10 w-full"
              onClick={() => {
                const isActive = leftPanelView === item.id;

                actions.setLeftPanelView(item.id);
                actions.setToolPanelOpen((current) =>
                  isActive ? !current : true,
                );
              }}
            >
              <item.icon className="size-4.5" />
            </Button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
