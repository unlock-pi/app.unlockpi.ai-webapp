"use client";

import { Button } from "@/components/ui/button";
import { leftPanelItems } from "@/features/canvas/lib/canvas-client-helpers";
import type { CanvasEditorController } from "@/features/canvas/types/canvas-other-types";
import { ScrollArea } from "@/components/ui/scroll-area";

type CanvasEditorLeftMicroRailProps = {
  controller: CanvasEditorController;
};

export function CanvasEditorLeftMicroRail({
  controller,
}: CanvasEditorLeftMicroRailProps) {
  return (
    <aside
      aria-label="Tool rail"
      className="flex min-h-0 flex-col border-r border-border bg-muted/20"
    >
      <ScrollArea className="min-h-0 flex-1" scrollFade scrollbarGutter>
        <div className="mt-5 ml-3 grid gap-2 px-2 pb-3">
          {leftPanelItems.map((item) => (
            <Button
              key={item.id}
              aria-label={item.label}
              size="icon-lg"
              title={item.label}
              variant={controller.leftPanelView === item.id ? "secondary" : "ghost"}
              className="h-10 w-full"
              onClick={() => {
                controller.actions.setLeftPanelView(item.id);
                controller.actions.setToolPanelOpen(true);
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
