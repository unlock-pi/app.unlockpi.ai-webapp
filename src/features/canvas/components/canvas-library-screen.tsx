"use client";

import { CanvasLibraryBrowser } from "@/features/canvas/components/canvas-library-browser";
import type { CanvasLibraryPageModel } from "@/features/canvas/types/canvas-other-types";

type CanvasLibraryScreenProps = {
  model: CanvasLibraryPageModel;
};

export function CanvasLibraryScreen({ model }: CanvasLibraryScreenProps) {
  return (
    <CanvasLibraryBrowser
      availableProjects={model.availableProjects}
      initialCanvases={model.canvases}
      showTemplateSpotlights
    />
  );
}
