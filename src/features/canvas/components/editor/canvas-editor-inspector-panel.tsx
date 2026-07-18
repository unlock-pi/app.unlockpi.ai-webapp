"use client";

import { Puck, usePuck } from "@puckeditor/core";
import { ChevronRightIcon } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { canvasPuckConfig } from "@/features/canvas/components/canvas-puck-config";
import type { CanvasEditorController } from "@/features/canvas/types/canvas-other-types";

type CanvasEditorInspectorPanelProps = {
  easyMode: boolean;
  screenContext: string;
  show: boolean;
  actions: Pick<CanvasEditorController["actions"], "setAiPanelOpen">;
};

export function CanvasEditorInspectorPanel({
  actions,
  easyMode,
  screenContext,
  show,
}: CanvasEditorInspectorPanelProps) {
  const { selectedItem } = usePuck<typeof canvasPuckConfig>();
  const selectedType = selectedItem?.type as
    | keyof typeof canvasPuckConfig.components
    | undefined;
  const selectedLabel = selectedType
    ? (canvasPuckConfig.components[selectedType]?.label ?? selectedType)
    : "Canvas";

  return (
    <motion.aside
      aria-hidden={!show}
      aria-label="Inspector"
      className="min-h-0 overflow-hidden border-l border-border bg-background lg:flex lg:flex-col"
      style={{ pointerEvents: show ? "auto" : "none" }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
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
      </div> */}

      <ScrollArea className="min-h-0 flex-1" scrollFade scrollbarGutter>
        <div className="grid gap-4 p-4">
          <div className="rounded-lg border border-border bg-card/40">
            <div className="flex justify-between items-center border-b border-border pr-2 py-2.5">
              {/* <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {inspectorTitle}
              </p> */}
              <p className="mt-1 px-1 text-[0.7rem]! font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {selectedLabel} 
              </p>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Collapse inspector"
                onClick={() => actions.setAiPanelOpen(false)}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
            <div className="py-3">
              <Puck.Fields wrapFields={false} />
            </div>
          </div>

          {easyMode ? null : (
            <div className="grid gap-2">
              <Label
                htmlFor="screen-context"
                className="px-1 text-[0.7rem]! font-bold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Screen context
              </Label>
              <Textarea
                id="screen-context"
                readOnly
                value={screenContext}
                className="min-h-32 text-xs border-border/30! border!"
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.aside>
  );
}
