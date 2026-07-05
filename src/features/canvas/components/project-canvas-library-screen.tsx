"use client";

import { CanvasLibraryBrowser } from "@/features/canvas/components/canvas-library-browser";
import type { ProjectCanvasLibraryPageModel } from "@/features/canvas/types/canvas-other-types";

type ProjectCanvasLibraryScreenProps = {
  model: ProjectCanvasLibraryPageModel;
};

export function ProjectCanvasLibraryScreen({
  model,
}: ProjectCanvasLibraryScreenProps) {
  return (
    <CanvasLibraryBrowser
      availableProjects={model.availableProjects}
      initialCanvases={model.canvases}
      projectContext={model.project}
      showTemplateSpotlights={false}
    />
  );
}
