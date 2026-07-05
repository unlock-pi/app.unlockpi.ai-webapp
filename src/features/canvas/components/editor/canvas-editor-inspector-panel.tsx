"use client";

import { Puck } from "@puckeditor/core";
import { BotIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { CanvasEditorController } from "@/features/canvas/types/canvas-other-types";

type CanvasEditorInspectorPanelProps = {
  controller: CanvasEditorController;
};

export function CanvasEditorInspectorPanel({
  controller,
}: CanvasEditorInspectorPanelProps) {
  if (!controller.showAiPanel) {
    return null;
  }

  return (
    <aside
      aria-label="Inspector"
      className="min-h-0 border-l border-border bg-background lg:flex lg:flex-col"
    >
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BotIcon className="size-4 text-primary" />
            <p className="text-sm font-semibold">Inspector</p>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Collapse inspector"
            onClick={() => controller.actions.setAiPanelOpen(false)}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Edit the selected block and review live screen context.
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1" scrollFade scrollbarGutter>
        <div className="grid gap-4 p-4">
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Selected block
            </div>
            <div className="p-3">
              <Puck.Fields />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="screen-context">Screen context</Label>
            <Textarea
              id="screen-context"
              readOnly
              value={controller.screenContext}
              className="min-h-32 text-xs"
            />
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
