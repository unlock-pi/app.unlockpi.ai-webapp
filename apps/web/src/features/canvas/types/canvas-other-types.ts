import type React from "react";
import type { LucideIcon } from "lucide-react";

import type { CanvasPresentationMode } from "@/features/canvas/components/canvas-presenter";
import type { CanvasRecord, CanvasSummary } from "@/features/canvas/lib/canvas-records";
import type {
  CanvasAiAction,
  CanvasDocument,
  CanvasFontFamily,
  CanvasTemplateKey,
  CanvasThemeId,
  CanvasTypographyScale,
  SketchSceneData,
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
  activeFontFamily: CanvasFontFamily;
  activeSlideId: string | null;
  activeTemplateKey: CanvasTemplateKey;
  activeTopic: string;
  activeTypographyScale: CanvasTypographyScale;
  actionLog: ActionLogItem[];
  aiPanelOpen: boolean;
  canvasTitle: string;
  /** Raw, untrimmed stored title — bind the title input to this, not canvasTitle. */
  canvasTitleDraft: string;
  canvasDocument: CanvasDocument;
  commandDraft: string;
  commandError: string | null;
  copySuccess: boolean;
  easyMode: boolean;
  frames: FrameSummary[];
  gridTemplateColumns: string;
  isAppearancePending: boolean;
  isDesktop: boolean;
  isLightTheme: boolean;
  isPublic: boolean;
  isDownloadingPdf: boolean;
  isShareDialogOpen: boolean;
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
    /** Focus a frame in the editor without modifying the canvas document. */
    goToFrame: (frameId: string) => void;
    /** Normalises the title (trim + fallback) and saves — call on blur/Enter. */
    commitCanvasTitle: () => void;
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
    setIsTitleEditing: React.Dispatch<React.SetStateAction<boolean>>;
    setLeftPanelView: React.Dispatch<React.SetStateAction<LeftPanelView>>;
    setPresentationMode: React.Dispatch<
      React.SetStateAction<CanvasPresentationMode | null>
    >;
    setToolPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    /**
     * Draw-panel scratchpad, read/written as a ref rather than state: it must
     * outlive the `<Puck key={puckRevision}>` remount that theme changes and AI
     * actions trigger, and re-rendering the controller on every stroke would be
     * far too hot a path.
     */
    getSketchScene: () => SketchSceneData | null;
    setSketchScene: (next: SketchSceneData) => void;
    toggleTheme: () => void;
    updateCanvasAppearance: (appearance: Partial<{
      theme: CanvasThemeId;
      typographyScale: CanvasTypographyScale;
      fontFamily: CanvasFontFamily;
    }>) => void;
  };
};
