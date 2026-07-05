"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useTheme } from "next-themes";
import { useDebouncedCallback } from "use-debounce";

import {
  applyCanvasAction,
  normalizeCanvasFrames,
  summarizeCanvas,
} from "@/features/canvas/lib/canvas-commands";
import {
  createPublicCanvasLink,
  copyTextToClipboard,
  downloadCanvasPreviewAsPdf,
  saveCanvasDraft,
} from "@/features/canvas/lib/canvas-editor-actions";
import {
  formatUpdatedAt,
  getCanvasTitle,
  getFrameSummaries,
  withCanvasTitle,
} from "@/features/canvas/lib/canvas-client-helpers";
import {
  DEFAULT_CANVAS_THEME,
  DEFAULT_CANVAS_TYPOGRAPHY_SCALE,
  canvasThemeOptions,
  canvasTypographyOptions,
  isCanvasThemeId,
  isCanvasTypographyScale,
} from "@/features/canvas/lib/canvas-theme";
import type {
  CanvasEditorController,
  CanvasEditorPageModel,
  LeftPanelView,
} from "@/features/canvas/types/canvas-other-types";
import type {
  CanvasAiAction,
  CanvasDocument,
  CanvasThemeId,
  CanvasTypographyScale,
} from "@/features/canvas/types/canvas-types";
import { toastManager } from "@/components/ui/toast";

export function useCanvasEditorController(
  model: CanvasEditorPageModel,
): CanvasEditorController {
  const { resolvedTheme, setTheme } = useTheme();
  const defaultDocument = normalizeCanvasFrames(model.canvas.document);
  const [canvasDocument, setCanvasDocument] =
    useState<CanvasDocument>(defaultDocument);
  const canvasDocumentRef = useRef(defaultDocument);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(
    model.canvas.activeFrameId,
  );
  const [shareSlug, setShareSlug] = useState<string | null>(
    model.canvas.shareSlug ?? null,
  );
  const [isPublic, setIsPublic] = useState(model.canvas.isPublic ?? false);
  const [puckRevision, setPuckRevision] = useState(0);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isStartClassOpen, setIsStartClassOpen] = useState(false);
  const [presentationMode, setPresentationMode] = useState<
    "voice" | "companion" | "manual" | null
  >(null);
  const [toolPanelOpen, setToolPanelOpen] = useState(true);
  const [leftPanelView, setLeftPanelView] = useState<LeftPanelView>("home");
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(
    `Last saved ${formatUpdatedAt(model.canvas.updatedAt)}`,
  );
  const [commandDraft, setCommandDraft] = useState(
    '{ "action": "set_array_values", "values": ["10", "20", "30"] }',
  );
  const [commandError, setCommandError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false,
  );
  const [actionLog, setActionLog] = useState([
    {
      id: "initial",
      message: `Opened ${model.canvas.title}.`,
    },
  ]);

  const appendLog = (message: string) => {
    setActionLog((items) =>
      [{ id: crypto.randomUUID(), message }, ...items].slice(0, 8),
    );
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncDesktopState = () => setIsDesktop(mediaQuery.matches);

    syncDesktopState();
    mediaQuery.addEventListener("change", syncDesktopState);

    return () => mediaQuery.removeEventListener("change", syncDesktopState);
  }, []);

  useEffect(() => {
    canvasDocumentRef.current = canvasDocument;
  }, [canvasDocument]);

  useEffect(() => {
    if (!activeSlideId) {
      return;
    }

    window.document
      .getElementById(`canvas-slide-${activeSlideId}`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [activeSlideId, puckRevision]);

  const rootTheme = canvasDocument.root?.props?.theme;
  const rootTypographyScale = canvasDocument.root?.props?.typographyScale;
  const activeCanvasTheme = isCanvasThemeId(rootTheme)
    ? rootTheme
    : DEFAULT_CANVAS_THEME;
  const activeTypographyScale = isCanvasTypographyScale(rootTypographyScale)
    ? rootTypographyScale
    : DEFAULT_CANVAS_TYPOGRAPHY_SCALE;
  const isLightTheme = resolvedTheme === "light";
  const showToolPanel = isDesktop && toolPanelOpen;
  const showAiPanel = isDesktop && aiPanelOpen;
  const gridTemplateColumns = [
    "72px",
    showToolPanel ? "clamp(240px, 22vw, 304px)" : "",
    "minmax(0, 1fr)",
    showAiPanel ? "clamp(280px, 24vw, 352px)" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const frames = getFrameSummaries(canvasDocument);
  const screenContext = summarizeCanvas(canvasDocument, activeSlideId);
  const canvasTitle = getCanvasTitle(canvasDocument);
  const activeCanvasId = model.canvas.id;
  const activeTemplateKey = model.canvas.templateKey ?? "array-intro";
  const activeTopic = model.canvas.topic ?? "";
  const publicLink =
    shareSlug && typeof window !== "undefined"
      ? `${window.location.origin}/canvas/shared/${shareSlug}`
      : "";

  async function persistCanvas(nextDocument = canvasDocument) {
    const title = getCanvasTitle(nextDocument);
    setSaveStatus("Saving...");

    const { response, result } = await saveCanvasDraft({
      activeCanvasId,
      activeFrameId: activeSlideId,
      document: nextDocument,
      templateKey: activeTemplateKey,
      title,
      topic: activeTopic.trim() || title,
    });

    if (!response.ok || !result?.canvas) {
      const message = result?.error ?? "Could not save the canvas draft.";
      setSaveStatus("Save failed");
      appendLog(message);
      toastManager.add({
        title: "Canvas not saved",
        description: message,
        type: "error",
      });
      return;
    }

    setCanvasDocument(nextDocument);
    canvasDocumentRef.current = nextDocument;
    setSaveStatus(
      `Last saved ${formatUpdatedAt(result.canvas.updated_at ?? new Date().toISOString())}`,
    );
      appendLog("Saved the canvas draft.");
    toastManager.add({
      title: "Canvas saved",
      // description: "Frames, content, and appearance are up to date.",
      type: "success",
    });
  }

  const debouncedPersistTitle = useDebouncedCallback(
    (nextTitle: string) => {
      void persistCanvas(withCanvasTitle(canvasDocumentRef.current, nextTitle));
    },
    700,
    { maxWait: 2000 },
  );

  useEffect(() => {
    return () => {
      debouncedPersistTitle.flush();
    };
  }, [debouncedPersistTitle]);

  const handleCanvasTitleChange = (nextTitle: string) => {
    setCanvasDocument((current) => withCanvasTitle(current, nextTitle));
    setSaveStatus("Unsaved changes");
    debouncedPersistTitle(nextTitle);
  };

  const handlePuckChange = (nextDocument: CanvasDocument) => {
    setCanvasDocument(normalizeCanvasFrames(nextDocument));
    setSaveStatus("Unsaved changes");
  };

  const updateCanvasAppearance = (
    appearance: Partial<{
      theme: CanvasThemeId;
      typographyScale: CanvasTypographyScale;
    }>,
  ) => {
    const current = canvasDocumentRef.current;
    const nextDocument: CanvasDocument = {
      ...current,
      root: {
        ...current.root,
        props: {
          title: current.root?.props?.title ?? "Untitled canvas",
          subject: current.root?.props?.subject ?? "computer_science",
          theme: appearance.theme ?? activeCanvasTheme,
          typographyScale: appearance.typographyScale ?? activeTypographyScale,
        },
      },
    };

    setCanvasDocument(nextDocument);
    canvasDocumentRef.current = nextDocument;
    setPuckRevision((revision) => revision + 1);
    setSaveStatus("Unsaved changes");
    appendLog(
      appearance.theme
        ? `Applied the ${canvasThemeOptions.find((theme) => theme.id === appearance.theme)?.name ?? "new"} theme.`
        : `Set typography to ${canvasTypographyOptions.find((scale) => scale.id === appearance.typographyScale)?.name ?? "a new size"}.`,
    );
    void persistCanvas(nextDocument);
  };

  const applyAction = (action: CanvasAiAction) => {
    const result = applyCanvasAction(canvasDocument, activeSlideId, action);
    setCanvasDocument(result.document);
    setActiveSlideId(result.activeSlideId);
    setAiPanelOpen(true);
    setPuckRevision((revision) => revision + 1);
    setCommandError(null);
    setSaveStatus("Unsaved changes");
    appendLog(result.message);
  };

  const runJsonCommand = () => {
    try {
      const parsed = JSON.parse(commandDraft) as CanvasAiAction;
      applyAction(parsed);
    } catch {
      setCommandError("Command must be valid JSON for now.");
    }
  };

  const handleCreatePublicLink = async () => {
    const { response, result } = await createPublicCanvasLink(activeCanvasId);

    if (!response.ok || !result?.canvas?.share_slug) {
      const message = result?.error ?? "Could not create a public link yet.";
      setShareError(message);
      toastManager.add({
        title: "Link not created",
        description: message,
        type: "error",
      });
      return;
    }

    setShareSlug(result.canvas.share_slug);
    setIsPublic(Boolean(result.canvas.is_public));
    setShareError(null);
    appendLog("Created a public link for this canvas.");
    toastManager.add({
      title: "Public link ready",
      description: "Anyone with the link can view this canvas.",
      type: "success",
    });
  };

  const copyPublicLink = async () => {
    if (!publicLink) {
      return;
    }

    try {
      await copyTextToClipboard(publicLink);
      appendLog("Copied the public link.");
      setCopySuccess(true);
      toastManager.add({ title: "Link copied", type: "success" });
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      toastManager.add({
        title: "Could not copy link",
        description: "Copy the URL from the field instead.",
        type: "error",
      });
    }
  };

  const downloadAsPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      await downloadCanvasPreviewAsPdf({
        previewSelector: ".canvas-preview-pane [data-puck-preview]",
        title: canvasTitle ?? "Canvas export",
      });
      appendLog("Downloaded the canvas as a PDF.");
      toastManager.add({
        title: "PDF downloaded",
        description: "Each frame was exported as a separate page.",
        type: "success",
      });
    } catch {
      toastManager.add({
        title: "PDF download failed",
        description: "Try again after the preview finishes rendering.",
        type: "error",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleFrameChromeAction = (event: MouseEvent<HTMLElement>) => {
    const actionTarget = (event.target as HTMLElement).closest(
      "[data-canvas-frame-action]",
    ) as HTMLElement | null;

    if (!actionTarget) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const frameId = actionTarget.dataset.canvasFrameId;
    const frameAction = actionTarget.dataset.canvasFrameAction;

    if (frameAction === "add") {
      applyAction({ action: "add_frame" });
    }

    if (frameAction === "add-below") {
      applyAction({ action: "add_frame_below", frameId });
    }

    if (frameAction === "duplicate") {
      applyAction({ action: "duplicate_frame", frameId });
    }

    if (frameAction === "delete") {
      applyAction({ action: "delete_frame", frameId });
    }
  };

  const toggleTheme = () => setTheme(isLightTheme ? "dark" : "light");

  return {
    activeCanvasId,
    activeCanvasTheme,
    activeSlideId,
    activeTemplateKey,
    activeTopic,
    activeTypographyScale,
    actionLog,
    aiPanelOpen,
    canvasDocument,
    canvasTitle,
    commandDraft,
    commandError,
    copySuccess,
    frames,
    gridTemplateColumns,
    isDesktop,
    isDownloadingPdf,
    isLightTheme,
    isPublic,
    isShareDialogOpen,
    isStartClassOpen,
    isTitleEditing,
    leftPanelView,
    presentationMode,
    publicLink,
    puckRevision,
    saveStatus,
    screenContext,
    shareError,
    shareSlug,
    showAiPanel,
    showToolPanel,
    toolPanelOpen,
    actions: {
      applyAction,
      copyPublicLink,
      downloadAsPdf,
      flushTitleSave: () => debouncedPersistTitle.flush(),
      handleCanvasTitleChange,
      handleCreatePublicLink,
      handleFrameChromeAction,
      handlePuckChange,
      persistCanvas,
      runJsonCommand,
      setAiPanelOpen,
      setCommandDraft,
      setIsShareDialogOpen,
      setIsStartClassOpen,
      setIsTitleEditing,
      setLeftPanelView,
      setPresentationMode,
      setToolPanelOpen,
      updateCanvasAppearance,
      toggleTheme,
    },
  };
}
