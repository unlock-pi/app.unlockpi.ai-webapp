"use client";

import "@puckeditor/core/puck.css";

import { Puck } from "@puckeditor/core";

import { ScrollArea } from "@/components/ui/scroll-area";
import { CanvasEditorHeader } from "@/features/canvas/components/editor/canvas-editor-header";
import { CanvasEditorInspectorPanel } from "@/features/canvas/components/editor/canvas-editor-inspector-panel";
import { CanvasEditorLeftMicroRail } from "@/features/canvas/components/editor/canvas-editor-left-micro-rail";
import { CanvasEditorLeftPanel } from "@/features/canvas/components/editor/canvas-editor-left-panel";
import { CanvasShareDialog } from "@/features/canvas/components/editor/canvas-share-dialog";
import { CanvasStartClassDialog } from "@/features/canvas/components/editor/canvas-start-class-dialog";
import { CanvasPresenter } from "@/features/canvas/components/canvas-presenter";
import { canvasPuckConfig } from "@/features/canvas/components/canvas-puck-config";
import {
  canvasPuckOverrides,
  getCanvasAppThemeVars,
} from "@/features/canvas/components/canvas-puck-overrides";
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
          <CanvasEditorHeader
            actions={{
              flushTitleSave: controller.actions.flushTitleSave,
              handleCanvasTitleChange: controller.actions.handleCanvasTitleChange,
              persistCanvas: controller.actions.persistCanvas,
              setAiPanelOpen: controller.actions.setAiPanelOpen,
              setEasyMode: controller.actions.setEasyMode,
              setIsShareDialogOpen: controller.actions.setIsShareDialogOpen,
              setIsStartClassOpen: controller.actions.setIsStartClassOpen,
              setIsTitleEditing: controller.actions.setIsTitleEditing,
              toggleTheme: controller.actions.toggleTheme,
            }}
            aiPanelOpen={controller.aiPanelOpen}
            canvasTitle={controller.canvasTitle}
            easyMode={controller.easyMode}
            isLightTheme={controller.isLightTheme}
            isTitleEditing={controller.isTitleEditing}
            saveStatus={controller.saveStatus}
          />

          <div
            className="grid min-h-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-200 ease-out"
            style={{ gridTemplateColumns: controller.gridTemplateColumns }}
          >
            <CanvasEditorLeftMicroRail
              actions={{
                setLeftPanelView: controller.actions.setLeftPanelView,
                setToolPanelOpen: controller.actions.setToolPanelOpen,
              }}
              easyMode={controller.easyMode}
              leftPanelView={controller.leftPanelView}
            />
            <CanvasEditorLeftPanel
              actionLog={controller.actionLog}
              actions={{
                applyAction: controller.actions.applyAction,
                runJsonCommand: controller.actions.runJsonCommand,
                setCommandDraft: controller.actions.setCommandDraft,
                updateCanvasAppearance:
                  controller.actions.updateCanvasAppearance,
              }}
              activeCanvasTheme={controller.activeCanvasTheme}
              activeSlideId={controller.activeSlideId}
              activeTypographyScale={controller.activeTypographyScale}
              commandDraft={controller.commandDraft}
              commandError={controller.commandError}
              frames={controller.frames}
              leftPanelView={controller.leftPanelView}
              show={controller.showToolPanel}
            />

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

            <CanvasEditorInspectorPanel
              actions={{
                setAiPanelOpen: controller.actions.setAiPanelOpen,
              }}
              easyMode={controller.easyMode}
              screenContext={controller.screenContext}
              show={controller.showAiPanel}
            />
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

      <CanvasStartClassDialog
        actions={{
          persistCanvas: controller.actions.persistCanvas,
          setIsStartClassOpen: controller.actions.setIsStartClassOpen,
          setPresentationMode: controller.actions.setPresentationMode,
        }}
        isStartClassOpen={controller.isStartClassOpen}
      />
      <CanvasShareDialog
        actions={{
          copyPublicLink: controller.actions.copyPublicLink,
          downloadAsPdf: controller.actions.downloadAsPdf,
          handleCreatePublicLink: controller.actions.handleCreatePublicLink,
          setIsShareDialogOpen: controller.actions.setIsShareDialogOpen,
        }}
        copySuccess={controller.copySuccess}
        isDownloadingPdf={controller.isDownloadingPdf}
        isPublic={controller.isPublic}
        isShareDialogOpen={controller.isShareDialogOpen}
        publicLink={controller.publicLink}
        shareError={controller.shareError}
        shareSlug={controller.shareSlug}
      />
    </section>
  );
}
