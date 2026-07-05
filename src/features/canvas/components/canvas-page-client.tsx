"use client";

import "@puckeditor/core/puck.css";

import { CanvasEditorScreen } from "@/features/canvas/components/canvas-editor-screen";
import { CanvasLibraryScreen } from "@/features/canvas/components/canvas-library-screen";
import { ProjectCanvasLibraryScreen } from "@/features/canvas/components/project-canvas-library-screen";
import type { CanvasCompatibilityPageProps } from "@/features/canvas/types/canvas-other-types";

export function CanvasPageClient({
  availableProjects = [],
  initialCanvas = null,
  initialCanvases = [],
  projectContext = null,
}: CanvasCompatibilityPageProps) {
  if (initialCanvas) {
    return (
      <CanvasEditorScreen
        model={{
          availableProjects,
          canvas: initialCanvas,
          mode: "editor",
          siblingCanvases: initialCanvases,
        }}
      />
    );
  }

  if (projectContext) {
    return (
      <ProjectCanvasLibraryScreen
        model={{
          availableProjects,
          canvases: initialCanvases,
          mode: "project_library",
          project: projectContext,
        }}
      />
    );
  }

  return (
    <CanvasLibraryScreen
      model={{
        availableProjects,
        canvases: initialCanvases,
        mode: "library",
      }}
    />
  );
}
