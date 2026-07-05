"use client";

import { Puck } from "@puckeditor/core";

import { ScrollArea } from "@/components/ui/scroll-area";
import { getCanvasAppThemeVars } from "@/features/canvas/components/canvas-puck-overrides";
import type { CanvasEditorController } from "@/features/canvas/types/canvas-other-types";

type CanvasEditorStageProps = {
  controller: CanvasEditorController;
};

export function CanvasEditorStage({ controller }: CanvasEditorStageProps) {
  return (
    <main
      aria-label="Canvas stage"
      className="canvas-preview-pane min-h-0 overflow-hidden bg-background"
      style={getCanvasAppThemeVars(controller.isLightTheme)}
    >
      <ScrollArea className="h-full min-h-0" scrollFade scrollbarGutter>
        <div
          className="box-border min-h-full py-4"
          onClick={controller.actions.handleFrameChromeAction}
          onDoubleClickCapture={() => controller.actions.setAiPanelOpen(true)}
        >
          <Puck.Preview />
        </div>
      </ScrollArea>
    </main>
  );
}
