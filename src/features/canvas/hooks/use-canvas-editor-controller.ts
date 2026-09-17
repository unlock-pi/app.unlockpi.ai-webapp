"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import { useTheme } from "next-themes";
import { useDebouncedCallback } from "use-debounce";

import { playCanvasActionSound } from "@/features/canvas/lib/canvas-action-sound";
import {
  addsContentPastFrameCapacity,
  applyCanvasAction,
  FRAME_CONTENT_LIMIT_MESSAGE,
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
  easyModeHiddenLeftPanelViews,
  formatUpdatedAt,
  getCanvasTitle,
  getFrameSummaries,
  withCanvasTitle,
} from "@/features/canvas/lib/canvas-client-helpers";
import {
  DEFAULT_CANVAS_FONT_FAMILY,
  DEFAULT_CANVAS_THEME,
  DEFAULT_CANVAS_TYPOGRAPHY_SCALE,
  canvasFontFamilyOptions,
  canvasThemeOptions,
  canvasTypographyOptions,
  isCanvasFontFamily,
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
  CanvasFontFamily,
  CanvasThemeId,
  CanvasTypographyScale,
  SketchSceneData,
} from "@/features/canvas/types/canvas-types";
import {
  isCanvasPresentationMode,
  type CanvasPresentationMode,
} from "@/features/canvas/lib/canvas-presentation";
import { toastManager } from "@/components/ui/toast";

/** Derived, not restated — a new presentation mode must not need editing here. */
type PresentationModeValue = CanvasPresentationMode | null;

type BlockCopyField = "title" | "caption";

function withoutBlockCopy(
  document: CanvasDocument,
  blockId: string | undefined,
  field: BlockCopyField,
  title: string | undefined,
): CanvasDocument {
  return {
    ...document,
    content: document.content.map((frame) => {
      if (frame.type !== "SlideBlock" || !Array.isArray(frame.props.content)) {
        return frame;
      }

      return {
        ...frame,
        props: {
          ...frame.props,
          content: frame.props.content.map((block) =>
            // Render's id is normally the stored id. The title fallback also
            // covers legacy Puck blocks whose render id was not persisted.
            (block.props.id === blockId ||
              (typeof (block.props as { title?: unknown }).title === "string" &&
                (block.props as { title?: string }).title === title))
              ? {
                ...block,
                props: { ...block.props, [field]: "" },
              } as typeof block
              : block,
          ),
        },
      };
    }),
  };
}

function scrollEditorToFrame(frameId: string) {
  // The thumbnail <Render>s intentionally render the same frame markup as the
  // editor, including its id. Restrict the lookup to the stage so we never
  // scroll a thumbnail in the left panel instead of the actual editor frame.
  const stage = window.document.querySelector(".canvas-preview-pane");
  const frame = Array.from(
    stage?.querySelectorAll<HTMLElement>("[id^='canvas-slide-']") ?? [],
  ).find((element) => element.id === `canvas-slide-${frameId}`);

  frame?.scrollIntoView({ block: "start", behavior: "smooth" });
}

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
  // Bumping puckRevision force-remounts the ENTIRE <Puck> tree — header,
  // sidebar, inspector, every frame — which is what makes an appearance
  // change (theme/typography/typeface) feel like it "freezes" for a couple
  // seconds before suddenly updating: the browser has no chance to paint
  // anything in between. Wrapping that state update in a transition lets
  // `isAppearancePending` flip true and PAINT immediately (its own update is
  // not part of the transition), so the caller can show a loading state that
  // bridges the gap instead of a silent freeze.
  const [isAppearancePending, startAppearanceTransition] = useTransition();
  // Lives here, above the `<Puck key={puckRevision}>` remount boundary, so a
  // theme change or AI action (both bump puckRevision to force-remount Puck)
  // doesn't wipe out an unsaved drawing sitting in the Draw panel scratchpad.
  const sketchSceneRef = useRef<SketchSceneData | null>(null);
  const getSketchScene = useCallback(() => sketchSceneRef.current, []);
  const setSketchScene = useCallback((next: SketchSceneData) => {
    sketchSceneRef.current = next;
  }, []);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  // Mirrored to the URL as `?present=<mode>` (see setPresentationMode below)
  // so refreshing mid-class, hitting back, or bookmarking a presenting link
  // resumes presenting instead of silently dropping back to the editor —
  // without a real route change, which would tear down and reconnect the
  // live WebRTC session to OpenAI's Realtime API every time.
  const [presentationMode, setPresentationModeState] =
    useState<PresentationModeValue>(null);
  const hasSyncedPresentationUrl = useRef(false);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("present");
    if (isCanvasPresentationMode(fromUrl)) {
      setPresentationModeState(fromUrl);
    }
  }, []);

  useEffect(() => {
    // The first effect only restores an existing URL state. Every later mode
    // change is a user action and can safely be mirrored back to the URL.
    if (!hasSyncedPresentationUrl.current) {
      hasSyncedPresentationUrl.current = true;
      return;
    }

    const url = new URL(window.location.href);
    if (presentationMode) {
      url.searchParams.set("present", presentationMode);
    } else {
      url.searchParams.delete("present");
    }
    window.history.replaceState(null, "", url);
  }, [presentationMode]);
  // URL synchronisation happens in the effect above, not inside this state
  // updater. Calling history.replaceState while React is rendering can make
  // Next's Router update during CanvasEditorScreen's render.
  const setPresentationMode = useCallback(
    (
      next:
        | PresentationModeValue
        | ((previous: PresentationModeValue) => PresentationModeValue),
    ) => {
      setPresentationModeState((previous) => {
        const resolved =
          typeof next === "function" ? next(previous) : next;
        return resolved;
      });
    },
    [],
  );
  const [easyMode, setEasyMode] = useState(true);
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
  // Keep the server and client's first render identical. Reading matchMedia
  // during state initiation made the server render collapsed panels while
  // a desktop browser rendered them open, producing a hydration mismatch.
  const [isDesktop, setIsDesktop] = useState(false);
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
    const removeBlockCopy = (event: Event) => {
      const detail = (event as CustomEvent<{
        field?: BlockCopyField;
        id?: string;
        title?: string;
      }>).detail;
      if (detail?.field !== "title" && detail?.field !== "caption") {
        return;
      }

      const nextDocument = withoutBlockCopy(
        canvasDocumentRef.current,
        detail.id,
        detail.field,
        detail.title,
      );
      canvasDocumentRef.current = nextDocument;
      setCanvasDocument(nextDocument);
      setPuckRevision((revision) => revision + 1);
      setSaveStatus("Unsaved changes");
    };

    window.addEventListener("canvas:remove-block-copy", removeBlockCopy);
    return () =>
      window.removeEventListener("canvas:remove-block-copy", removeBlockCopy);
  }, []);

  useEffect(() => {
    if (!activeSlideId) {
      return;
    }

    // Puck can briefly replace the preview while it applies an edit. Waiting
    // one paint ensures the target belongs to the current editor tree before
    // asking the stage's ScrollArea to reveal it.
    const frame = window.requestAnimationFrame(() => {
      scrollEditorToFrame(activeSlideId);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeSlideId, puckRevision]);

  useEffect(() => {
    if (!easyMode) {
      return;
    }

    if (easyModeHiddenLeftPanelViews.includes(leftPanelView)) {
      // TODO: If the teacher switches to easy mode while a hidden panel is open, force it back to the home view so they don't get stuck in a hidden panel.
      // FIX: `setLeftPanelView` should be called inside `setEasyMode`
      setLeftPanelView("home");
    }
  }, [easyMode, leftPanelView]);

  const rootTheme = canvasDocument.root?.props?.theme;
  const rootTypographyScale = canvasDocument.root?.props?.typographyScale;
  const rootFontFamily = canvasDocument.root?.props?.fontFamily;
  const activeCanvasTheme = isCanvasThemeId(rootTheme)
    ? rootTheme
    : DEFAULT_CANVAS_THEME;
  const activeTypographyScale = isCanvasTypographyScale(rootTypographyScale)
    ? rootTypographyScale
    : DEFAULT_CANVAS_TYPOGRAPHY_SCALE;
  const activeFontFamily = isCanvasFontFamily(rootFontFamily)
    ? rootFontFamily
    : DEFAULT_CANVAS_FONT_FAMILY;
  const isLightTheme = resolvedTheme === "light";
  const showToolPanel = isDesktop && toolPanelOpen;
  const showAiPanel = isDesktop && aiPanelOpen;
  const gridTemplateColumns = [
    "72px",
    showToolPanel ? "clamp(240px, 22vw, 304px)" : "0px",
    "minmax(0, 1fr)",
    showAiPanel ? "clamp(280px, 24vw, 352px)" : "0px",
  ].join(" ");
  const frames = getFrameSummaries(canvasDocument);
  const screenContext = summarizeCanvas(canvasDocument, activeSlideId);
  const canvasTitle = getCanvasTitle(canvasDocument);
  // The RAW stored title — no trim, no "Untitled canvas" fallback. This is
  // what the title <Input> must bind to: `canvasTitle` above runs
  // `.trim() || "Untitled canvas"`, so feeding that back into a controlled
  // input stripped the trailing space on every keystroke (you could never
  // type a space) and made clearing the field impossible (it snapped back
  // to "Untitled canvas"). Normalising happens on commit instead — see
  // commitCanvasTitle.
  const canvasTitleDraft = canvasDocument.root?.props?.title ?? "";
  const activeCanvasId = model.canvas.id;
  const activeTemplateKey = model.canvas.templateKey ?? "array-intro";
  const activeTopic = model.canvas.topic ?? "";
  const publicLink =
    shareSlug && typeof window !== "undefined"
      ? `${window.location.origin}/canvas/shared/${shareSlug}`
      : "";

  // Persist the canvas document to the server. If `nextDocument` is not provided, it defaults to the current `canvasDocument`.
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
    // TODO: Consider adding error handling and user feedback for the save operation.
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

  // Saves 3s after the teacher actually STOPS typing. Deliberately no
  // `maxWait`: that option force-fires the callback on a fixed interval even
  // while typing is still in flight, so a long title used to trigger a save
  // every couple of seconds mid-word. A plain trailing debounce means one
  // save per pause — and blur/Enter still commit immediately via
  // commitCanvasTitle, so nothing is ever lost waiting out the 3s.
  const debouncedPersistTitle = useDebouncedCallback(
    (nextTitle: string) => {
      void persistCanvas(withCanvasTitle(canvasDocumentRef.current, nextTitle));
    },
    3000,
  );

  useEffect(() => {
    return () => {
      debouncedPersistTitle.flush();
    };
  }, [debouncedPersistTitle]);

  const handleCanvasTitleChange = (nextTitle: string) => {
    // Store exactly what was typed, spaces and all. persistCanvas trims for
    // the DB payload via getCanvasTitle, so a half-typed "Binary " never
    // reaches storage untrimmed — but it stays intact in the editor while
    // the teacher is still typing the next word.
    setCanvasDocument((current) => withCanvasTitle(current, nextTitle));
    setSaveStatus("Unsaved changes");
    debouncedPersistTitle(nextTitle);
  };

  /**
   * Called when the teacher finishes editing the title (blur or Enter).
   * This is where the raw draft gets normalised — trimmed, and swapped for
   * the fallback if they left it empty — then saved immediately rather than
   * waiting out the debounce.
   */
  const commitCanvasTitle = () => {
    const normalized =
      canvasDocumentRef.current.root?.props?.title?.trim() || "Untitled canvas";
    const nextDocument = withCanvasTitle(canvasDocumentRef.current, normalized);
    setCanvasDocument(nextDocument);
    canvasDocumentRef.current = nextDocument;
    debouncedPersistTitle.cancel();
    void persistCanvas(nextDocument);
  };

  const handlePuckChange = (nextDocument: CanvasDocument) => {
    const normalizedDocument = normalizeCanvasFrames(nextDocument);
    // Check for a frame with too much content.
    // TODO: This should be a warning.
    if (addsContentPastFrameCapacity(canvasDocumentRef.current, normalizedDocument)) {
      toastManager.add({
        title: "Frame has no room",
        description: FRAME_CONTENT_LIMIT_MESSAGE,
        type: "error",
      });
      // Puck owns the in-progress drag state. Re-mount from the last accepted
      // document so a rejected drop cannot remain visible in the editor.
      setPuckRevision((revision) => revision + 1);
      return;
    }

    // Puck owns the in-progress drag state. Re-mount from the last accepted
    // document so a rejected drop cannot remain visible in the editor.
    setCanvasDocument(normalizedDocument);
    canvasDocumentRef.current = normalizedDocument;
    setSaveStatus("Unsaved changes");
    // Inline block controls (title, description, and their remove buttons)
    // are edited through Puck. Persist that live document immediately so the
    // compacted layout survives a refresh just like an inspector edit does.
    void persistCanvas(normalizedDocument);
  };

  const updateCanvasAppearance = (
    appearance: Partial<{
      theme: CanvasThemeId;
      typographyScale: CanvasTypographyScale;
      fontFamily: CanvasFontFamily;
    }>,
  ) => {
    const current = canvasDocumentRef.current;
    const nextDocument: CanvasDocument = {
      ...current,
      root: {
        ...current.root,
        // Merge the new appearance into the existing props
        props: {
          title: current.root?.props?.title ?? "Untitled canvas",
          subject: current.root?.props?.subject ?? "computer_science",
          theme: appearance.theme ?? activeCanvasTheme,
          typographyScale: appearance.typographyScale ?? activeTypographyScale,
          fontFamily: appearance.fontFamily ?? activeFontFamily,
        },
      },
    };

    canvasDocumentRef.current = nextDocument;
    setSaveStatus("Unsaved changes");
    appendLog(
      appearance.theme
        ? `Applied the ${canvasThemeOptions.find((theme) => theme.id === appearance.theme)?.name ?? "new"} theme.`
        : appearance.fontFamily
          ? `Set typeface to ${canvasFontFamilyOptions.find((family) => family.id === appearance.fontFamily)?.name ?? "a new typeface"}.`
          : `Set typography to ${canvasTypographyOptions.find((scale) => scale.id === appearance.typographyScale)?.name ?? "a new size"}.`,
    );
    // The Puck remount is the expensive part — keep it (and the document
    // swap that triggers it) inside the transition so `isAppearancePending`
    // is available to show a loading state for exactly its duration.
    startAppearanceTransition(() => {
      setCanvasDocument(nextDocument);
      setPuckRevision((revision) => revision + 1);
    });
    void persistCanvas(nextDocument);
  };

  const applyAction = (action: CanvasAiAction) => {
    const result = applyCanvasAction(canvasDocument, activeSlideId, action);
    playCanvasActionSound(action);
    setCanvasDocument(result.document);
    setActiveSlideId(result.activeSlideId);
    setAiPanelOpen(true);
    setPuckRevision((revision) => revision + 1);
    setCommandError(null);
    setSaveStatus("Unsaved changes");
    appendLog(result.message);
  };

  const goToFrame = (frameId: string) => {
    if (!frames.some((frame) => frame.id === frameId)) {
      return;
    }

    setActiveSlideId(frameId);
    // Clicking the already-active thumbnail should still bring its frame into
    // view. The effect above only runs when React observes a state change.
    if (activeSlideId === frameId) {
      window.requestAnimationFrame(() => {
        scrollEditorToFrame(frameId);
      });
    }
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
    activeFontFamily,
    activeSlideId,
    activeTemplateKey,
    activeTopic,
    activeTypographyScale,
    actionLog,
    aiPanelOpen,
    canvasDocument,
    canvasTitle,
    canvasTitleDraft,
    commandDraft,
    commandError,
    copySuccess,
    easyMode,
    frames,
    gridTemplateColumns,
    isAppearancePending,
    isDesktop,
    isDownloadingPdf,
    isLightTheme,
    isPublic,
    isShareDialogOpen,
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
      goToFrame,
      copyPublicLink,
      downloadAsPdf,
      commitCanvasTitle,
      flushTitleSave: () => debouncedPersistTitle.flush(),
      handleCanvasTitleChange,
      handleCreatePublicLink,
      handleFrameChromeAction,
      getSketchScene,
      handlePuckChange,
      persistCanvas,
      runJsonCommand,
      setAiPanelOpen,
      setCommandDraft,
      setEasyMode,
      setIsShareDialogOpen,
      setIsTitleEditing,
      setLeftPanelView,
      setPresentationMode,
      setSketchScene,
      setToolPanelOpen,
      updateCanvasAppearance,
      toggleTheme,
    },
  };
}
