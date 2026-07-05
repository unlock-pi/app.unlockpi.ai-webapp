"use client";

import "@puckeditor/core/puck.css";

import { Puck } from "@puckeditor/core";

import { CanvasEditorHeader } from "@/features/canvas/components/editor/canvas-editor-header";
import { CanvasEditorInspectorPanel } from "@/features/canvas/components/editor/canvas-editor-inspector-panel";
import { CanvasEditorLeftMicroRail } from "@/features/canvas/components/editor/canvas-editor-left-micro-rail";
import { CanvasEditorLeftPanel } from "@/features/canvas/components/editor/canvas-editor-left-panel";
import { CanvasShareDialog } from "@/features/canvas/components/editor/canvas-share-dialog";
import { CanvasEditorStage } from "@/features/canvas/components/editor/canvas-editor-stage";
import { CanvasStartClassDialog } from "@/features/canvas/components/editor/canvas-start-class-dialog";
import { CanvasPresenter } from "@/features/canvas/components/canvas-presenter";
import { canvasPuckConfig } from "@/features/canvas/components/canvas-puck-config";
import { canvasPuckOverrides } from "@/features/canvas/components/canvas-puck-overrides";
import { useCanvasEditorController } from "@/features/canvas/hooks/use-canvas-editor-controller";
import type { CanvasEditorPageModel } from "@/features/canvas/types/canvas-other-types";

type CanvasEditorScreenProps = {
  model: CanvasEditorPageModel;
};

export function CanvasEditorScreen({ model }: CanvasEditorScreenProps) {
  const controller = useCanvasEditorController(model);

  return (
    <section
      aria-label="Canvas editor"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground"
    >
      <Puck<typeof canvasPuckConfig>
        key={`canvas-${controller.puckRevision}`}
        config={canvasPuckConfig}
        data={controller.canvasDocument}
        height="100%"
        iframe={{ enabled: false }}
        overrides={canvasPuckOverrides}
        onChange={controller.actions.handlePuckChange}
        onPublish={(nextDocument) => {
          void controller.actions.persistCanvas(nextDocument);
        }}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <CanvasEditorHeader controller={controller} />

          <div
            className="grid min-h-0 flex-1 overflow-hidden"
            style={{ gridTemplateColumns: controller.gridTemplateColumns }}
          >
            <CanvasEditorLeftMicroRail controller={controller} />
            <CanvasEditorLeftPanel controller={controller} />
            <CanvasEditorStage controller={controller} />
            <CanvasEditorInspectorPanel controller={controller} />
          </div>
        </div>
      </Puck>

      {controller.presentationMode ? (
        <CanvasPresenter
          canvasId={controller.activeCanvasId}
          document={controller.canvasDocument}
          initialFrameId={controller.activeSlideId}
          mode={controller.presentationMode}
          onClose={() => controller.actions.setPresentationMode(null)}
          title={controller.canvasTitle}
        />
      ) : null}

      <CanvasStartClassDialog controller={controller} />
      <CanvasShareDialog controller={controller} />
    </section>
  );
}
