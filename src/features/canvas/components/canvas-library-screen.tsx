"use client";

import { CanvasLibraryBrowser } from "@/features/canvas/components/canvas-library-browser";
import type {
  CanvasLibraryPageModel,
  ProjectCanvasLibraryPageModel,
} from "@/features/canvas/types/canvas-other-types";

type CanvasLibraryScreenProps = {
  model: CanvasLibraryPageModel | ProjectCanvasLibraryPageModel;
};

export function CanvasLibraryScreen({ model }: CanvasLibraryScreenProps) {
  return (
    <CanvasLibraryBrowser
      availableProjects={model.availableProjects}
      initialCanvases={model.canvases}
      projectContext={model.mode === "project_library" ? model.project : undefined}
      showTemplateSpotlights={model.mode === "library"}
    />
  );
}
