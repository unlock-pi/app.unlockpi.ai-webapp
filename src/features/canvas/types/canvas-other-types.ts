import type React from "react";
import type { LucideIcon } from "lucide-react";

import type { CanvasPresentationMode } from "@/features/canvas/components/canvas-presenter";
import type { CanvasRecord, CanvasSummary } from "@/features/canvas/lib/canvas-records";
import type {
  CanvasAiAction,
  CanvasDocument,
  CanvasTemplateKey,
  CanvasThemeId,
  CanvasTypographyScale,
} from "@/features/canvas/types/canvas-types";
import type { TeachingProject } from "@/features/project/types/project-types";

export type CanvasScreenMode = "library" | "project_library" | "editor";

export type CanvasProjectOption = Pick<TeachingProject, "id" | "name">;

export type CanvasProjectContext = {
  id: string;
  name: string;
};

export type CanvasLibraryPageModel = {
  availableProjects: CanvasProjectOption[];
  canvases: CanvasSummary[];
  mode: "library";
};

export type ProjectCanvasLibraryPageModel = {
  availableProjects: CanvasProjectOption[];
  canvases: CanvasSummary[];
  mode: "project_library";
  project: CanvasProjectContext;
};

export type CanvasEditorPageModel = {
  availableProjects: CanvasProjectOption[];
  canvas: CanvasRecord;
  mode: "editor";
  siblingCanvases: CanvasSummary[];
};

export type ActionLogItem = {
  id: string;
  message: string;
};

export type FrameSummary = {
  id: string;
  title: string;
};

export type LeftPanelView =
  | "home"
  | "frames"
  | "changes"
  | "commands"
  | "voice"
  | "theme"
  | "templates";

export type LeftPanelItem = {
  icon: LucideIcon;
  id: LeftPanelView;
  label: string;
};

export type LeftPanelCopy = Record<
  LeftPanelView,
  { description: string; title: string }
>;

export type DrawerItemMeta = {
  description?: string;
  icon?: LucideIcon;
  label: string;
  variant?: "heading" | "subheading" | "body";
};

export type CanvasQuickCommand = {
  action: CanvasAiAction;
  label: string;
};

export type CanvasEditorController = {
  activeCanvasId: string | null;
  activeCanvasTheme: CanvasThemeId;
  activeSlideId: string | null;
  activeTemplateKey: CanvasTemplateKey;
  activeTopic: string;
  activeTypographyScale: CanvasTypographyScale;
  actionLog: ActionLogItem[];
  aiPanelOpen: boolean;
  canvasTitle: string;
  canvasDocument: CanvasDocument;
  commandDraft: string;
  commandError: string | null;
  copySuccess: boolean;
  easyMode: boolean;
  frames: FrameSummary[];
  gridTemplateColumns: string;
  isDesktop: boolean;
  isLightTheme: boolean;
  isPublic: boolean;
  isDownloadingPdf: boolean;
  isShareDialogOpen: boolean;
  isStartClassOpen: boolean;
  isTitleEditing: boolean;
  leftPanelView: LeftPanelView;
  presentationMode: CanvasPresentationMode | null;
  publicLink: string;
  puckRevision: number;
  saveStatus: string;
  screenContext: string;
  shareError: string | null;
  shareSlug: string | null;
  showAiPanel: boolean;
  showToolPanel: boolean;
  toolPanelOpen: boolean;
  actions: {
    applyAction: (action: CanvasAiAction) => void;
    copyPublicLink: () => Promise<void>;
    downloadAsPdf: () => Promise<void>;
    flushTitleSave: () => void;
    handleCanvasTitleChange: (nextTitle: string) => void;
    handleCreatePublicLink: () => Promise<void>;
    handleFrameChromeAction: (event: React.MouseEvent<HTMLElement>) => void;
    handlePuckChange: (nextDocument: CanvasDocument) => void;
    persistCanvas: (nextDocument?: CanvasDocument) => Promise<void>;
    runJsonCommand: () => void;
    setAiPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setCommandDraft: React.Dispatch<React.SetStateAction<string>>;
    setEasyMode: React.Dispatch<React.SetStateAction<boolean>>;
    setIsShareDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsStartClassOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsTitleEditing: React.Dispatch<React.SetStateAction<boolean>>;
    setLeftPanelView: React.Dispatch<React.SetStateAction<LeftPanelView>>;
    setPresentationMode: React.Dispatch<
      React.SetStateAction<CanvasPresentationMode | null>
    >;
    setToolPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    toggleTheme: () => void;
    updateCanvasAppearance: (appearance: Partial<{
      theme: CanvasThemeId;
      typographyScale: CanvasTypographyScale;
    }>) => void;
  };
};
