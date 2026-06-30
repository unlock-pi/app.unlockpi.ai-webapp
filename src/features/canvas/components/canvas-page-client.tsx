"use client";

import "@puckeditor/core/puck.css";
import { FolderIcon, SearchIcon } from "lucide-react";
import {
  Card,
  CardFrame,
  CardFrameAction,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Puck, type Overrides } from "@puckeditor/core";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BotIcon,
  BracesIcon,
  BoxesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  Code2Icon,
  CopyIcon,
  GitBranchIcon,
  LayoutPanelTopIcon,
  ListChecksIcon,
  LoaderCircleIcon,
  MicIcon,
  MoreHorizontalIcon,
  MoonIcon,
  NetworkIcon,
  PanelRightIcon,
  PaletteIcon,
  PlusIcon,
  SaveIcon,
  Share2Icon,
  SunIcon,
  Trash2Icon,
  type LucideIcon,
  CheckIcon,
  InfoIcon,
  PenLineIcon,
  PresentationIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useDebouncedCallback } from "use-debounce";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogPanel,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient as createSupabaseClient } from "@/lib/client";
import {
  applyCanvasAction,
  getInitialSlideId,
  normalizeCanvasFrames,
  summarizeCanvas,
} from "@/features/canvas/lib/canvas-commands";
import { canvasPuckConfig } from "@/features/canvas/components/canvas-puck-config";
import type { CanvasSummary } from "@/features/canvas/lib/canvas-records";
import { mapCanvasSummary } from "@/features/canvas/lib/canvas-records";
import {
  canvasTemplateOptions,
  createCanvasTemplate,
} from "@/features/canvas/lib/canvas-templates";
import type {
  CanvasAiAction,
  CanvasDocument,
  CanvasTemplateKey,
  CanvasThemeId,
  CanvasTypographyScale,
} from "@/features/canvas/types/canvas-types";
import {
  DEFAULT_CANVAS_THEME,
  DEFAULT_CANVAS_TYPOGRAPHY_SCALE,
  canvasThemeOptions,
  canvasTypographyOptions,
  isCanvasThemeId,
  isCanvasTypographyScale,
} from "@/features/canvas/lib/canvas-theme";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toastManager } from "@/components/ui/toast";
import { PiChalkboardDuotone } from "react-icons/pi";
import Logo from "@/components/logo";
import {
  ActionLogItem,
  CanvasPageClientProps,
  DrawerItemMeta,
  FrameSummary,
  LeftPanelView,
} from "../types/canvas-other-types";
import {
  CanvasPresenter,
  type CanvasPresentationMode,
} from "@/features/canvas/components/canvas-presenter";

const leftPanelItems: Array<{
  id: LeftPanelView;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "home", label: "Insert", icon: BoxesIcon },
  { id: "frames", label: "Frames", icon: LayoutPanelTopIcon },
  { id: "changes", label: "Recent changes", icon: Clock3Icon },
  { id: "commands", label: "Command JSON", icon: BracesIcon },
  { id: "voice", label: "Quick voice", icon: MicIcon },
  // { id: "templates", label: "Templates", icon: SparklesIcon },
  { id: "theme", label: "Theme", icon: PaletteIcon },
];

const leftPanelCopy: Record<
  LeftPanelView,
  { title: string; description: string }
> = {
  home: {
    title: "Insert",
    description: "Add blocks and frames to the canvas",
  },
  frames: {
    title: "Frames",
    description: "Jump between frames quickly",
  },
  changes: {
    title: "Recent changes",
    description: "Track the latest edits on this canvas",
  },
  commands: {
    title: "Command JSON",
    description: "Run structured canvas commands",
  },
  voice: {
    title: "Quick voice",
    description: "Run one-tap classroom intents",
  },
  theme: {
    title: "Theme",
    description: "Set the visual style for every frame",
  },
  templates: {
    title: "Templates",
    description: "Start a fresh canvas from a template",
  },
};

const EMPTY_CANVASES: CanvasSummary[] = [];

const updatedAtFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const quickCommands: Array<{ label: string; action: CanvasAiAction }> = [
  {
    label: "Add array",
    action: {
      action: "add_array_block",
      title: "Array B",
      values: ["2", "4", "6", "8"],
    },
  },
  {
    label: "Make array length 6",
    action: { action: "resize_array", length: 6 },
  },
  {
    label: "Highlight index 2",
    action: { action: "highlight_array_index", index: 2 },
  },
  {
    label: "Add next frame",
    action: { action: "add_frame", title: "Next teaching beat" },
  },
];

const drawerItemMeta: Record<string, DrawerItemMeta> = {
  SlideBlock: {
    label: "Frame",
    description: "A blank teaching canvas frame",
    icon: LayoutPanelTopIcon,
  },
  Frame: {
    label: "Frame",
    description: "A blank teaching canvas frame",
    icon: LayoutPanelTopIcon,
  },
  HeadingTextBlock: {
    label: "Heading",
    variant: "heading",
  },
  Heading: {
    label: "Heading",
    variant: "heading",
  },
  SubheadingTextBlock: {
    label: "Subheading",
    variant: "subheading",
  },
  Subheading: {
    label: "Subheading",
    variant: "subheading",
  },
  BodyTextBlock: {
    label: "Body",
    variant: "body",
  },
  Body: {
    label: "Body",
    variant: "body",
  },
  CheckpointBlock: {
    label: "Checkpoint",
    description: "Question and expected answer",
    icon: ListChecksIcon,
  },
  Checkpoint: {
    label: "Checkpoint",
    description: "Question and expected answer",
    icon: ListChecksIcon,
  },
  ArrayBlock: {
    label: "Array",
    description: "Resizable indexed elements",
    icon: BoxesIcon,
  },
  Array: {
    label: "Array",
    description: "Resizable indexed elements",
    icon: BoxesIcon,
  },
  LinkedListBlock: {
    label: "Linked list",
    description: "Nodes connected by pointers",
    icon: GitBranchIcon,
  },
  "Linked list": {
    label: "Linked list",
    description: "Nodes connected by pointers",
    icon: GitBranchIcon,
  },
  MindMapBlock: {
    label: "Mind map",
    description: "Concept map with branches",
    icon: NetworkIcon,
  },
  "Mind map": {
    label: "Mind map",
    description: "Concept map with branches",
    icon: NetworkIcon,
  },
  CodeBlock: {
    label: "Code",
    description: "Snippet and explanation",
    icon: Code2Icon,
  },
  Code: {
    label: "Code",
    description: "Snippet and explanation",
    icon: Code2Icon,
  },
  MermaidBlock: {
    label: "Mermaid",
    description: "Diagram from Mermaid syntax",
    icon: Share2Icon,
  },
  Mermaid: {
    label: "Mermaid",
    description: "Diagram from Mermaid syntax",
    icon: Share2Icon,
  },
};

function CanvasDrawerItem({ name }: { name: string }) {
  const meta = drawerItemMeta[name] ?? {
    label: name,
    description: "Drag into a frame",
    icon: BoxesIcon,
  };
  const Icon = meta.icon ?? BoxesIcon;

  return (
    <div
      className={cn(
        "canvas-drawer-card",
        meta.variant
          ? "canvas-drawer-card--text"
          : "canvas-drawer-card--default",
      )}
    >
      {meta.variant ? (
        <span
          className={cn(
            "block truncate",
            meta.variant === "heading" &&
              "text-[2rem] font-bold tracking-[-0.05em]",
            meta.variant === "subheading" &&
              "text-[1.35rem] tracking-[-0.03em]",
            meta.variant === "body" && "text-base",
          )}
          style={{
            fontFamily:
              meta.variant === "heading"
                ? "var(--font-canvas-heading), var(--font-system), sans-serif"
                : meta.variant === "subheading"
                  ? "var(--font-canvas-subheading), var(--font-system), sans-serif"
                  : "var(--font-canvas-body), var(--font-system), sans-serif",
          }}
        >
          {meta.label}
        </span>
      ) : (
        <>
          <div className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-muted/45 text-foreground">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {meta.label}
            </p>
            {meta.description ? (
              <p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
                {meta.description}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

const canvasPuckOverrides: Partial<Overrides<typeof canvasPuckConfig>> = {
  drawerItem: ({ name }) => <CanvasDrawerItem name={name} />,
};

function getFrameSummaries(document: CanvasDocument): FrameSummary[] {
  return document.content
    .filter((item) => item.type === "SlideBlock")
    .map((item) => ({
      id: item.props.id,
      title: item.props.title,
    }));
}

function formatUpdatedAt(value: string) {
  return updatedAtFormatter.format(new Date(value));
}

function createShareSlug() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12).toLowerCase();
}

function withCanvasTitle(
  document: CanvasDocument,
  title: string,
): CanvasDocument {
  return {
    ...document,
    root: {
      ...document.root,
      props: {
        ...document.root?.props,
        subject: document.root?.props?.subject ?? "computer_science",
        theme: document.root?.props?.theme ?? DEFAULT_CANVAS_THEME,
        typographyScale:
          document.root?.props?.typographyScale ??
          DEFAULT_CANVAS_TYPOGRAPHY_SCALE,
        title,
      },
    },
  };
}

function buildCanvasPayload({
  activeFrameId,
  document,
  templateKey,
  title,
  topic,
}: {
  activeFrameId: string | null;
  document: CanvasDocument;
  templateKey: CanvasTemplateKey | null;
  title: string;
  topic: string | null;
}) {
  return {
    active_frame_id: activeFrameId,
    document,
    status: "draft",
    subject: "computer_science",
    template_key: templateKey,
    title,
    topic,
  };
}

export function CanvasPageClient({
  initialCanvas = null,
  initialCanvases = EMPTY_CANVASES,
}: CanvasPageClientProps) {
  const router = useRouter();
  const defaultTemplate = useMemo(
    () => createCanvasTemplate("array-intro"),
    [],
  );
  const defaultDocument = useMemo(
    () =>
      normalizeCanvasFrames(
        initialCanvas?.document ?? defaultTemplate.document,
      ),
    [defaultTemplate.document, initialCanvas?.document],
  );
  const { resolvedTheme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false,
  );
  const [canvasDocument, setCanvasDocument] =
    useState<CanvasDocument>(defaultDocument);
  const canvasDocumentRef = useRef(defaultDocument);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(
    initialCanvas?.activeFrameId ?? getInitialSlideId(defaultDocument),
  );
  const activeCanvasId = initialCanvas?.id ?? null;
  const activeTemplateKey = initialCanvas?.templateKey ?? "array-intro";
  const activeTopic = initialCanvas?.topic ?? "";
  const [shareSlug, setShareSlug] = useState<string | null>(
    initialCanvas?.shareSlug ?? null,
  );
  const [isPublic, setIsPublic] = useState(initialCanvas?.isPublic ?? false);
  const [canvasRecords, setCanvasRecords] =
    useState<CanvasSummary[]>(initialCanvases);
  const [puckRevision, setPuckRevision] = useState(0);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isStartClassOpen, setIsStartClassOpen] = useState(false);
  const [presentationMode, setPresentationMode] =
    useState<CanvasPresentationMode | null>(null);
  const [topicSearch, setTopicSearch] = useState(initialCanvas?.topic ?? "");
  const [selectedTemplateKey, setSelectedTemplateKey] =
    useState<CanvasTemplateKey>(initialCanvas?.templateKey ?? "array-intro");
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [toolPanelOpen, setToolPanelOpen] = useState(true);
  const [leftPanelView, setLeftPanelView] = useState<LeftPanelView>("home");
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(
    initialCanvas
      ? `Last saved ${formatUpdatedAt(initialCanvas.updatedAt)}`
      : "Library view",
  );
  const [commandDraft, setCommandDraft] = useState(
    '{ "action": "set_array_values", "values": ["10", "20", "30"] }',
  );
  const [commandError, setCommandError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<ActionLogItem[]>([
    {
      id: "initial",
      message: initialCanvas
        ? `Opened ${initialCanvas.title}.`
        : "Canvas library loaded. Pick a canvas or create a new one.",
    },
  ]);

  const isLibraryView = !activeCanvasId;
  const frames = getFrameSummaries(canvasDocument);
  const screenContext = summarizeCanvas(canvasDocument, activeSlideId);
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
  const filteredTemplates = canvasTemplateOptions.filter((template) => {
    const query = topicSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return `${template.title} ${template.description}`
      .toLowerCase()
      .includes(query);
  });
  const gridTemplateColumns = [
    "72px",
    showToolPanel ? "clamp(240px, 22vw, 304px)" : "",
    "minmax(0, 1fr)",
    showAiPanel ? "clamp(280px, 24vw, 352px)" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
    if (!activeSlideId || isLibraryView) {
      return;
    }

    window.document
      .getElementById(`canvas-slide-${activeSlideId}`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [activeSlideId, isLibraryView, puckRevision]);

  const appendLog = (message: string) => {
    setActionLog((items) =>
      [{ id: crypto.randomUUID(), message }, ...items].slice(0, 8),
    );
  };

  const updateCanvasSummary = (nextSummary: CanvasSummary) => {
    setCanvasRecords((items) => {
      const existing = items.some((item) => item.id === nextSummary.id);
      const nextItems = existing
        ? items.map((item) => (item.id === nextSummary.id ? nextSummary : item))
        : [nextSummary, ...items];

      return nextItems.sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      );
    });
  };

  const removeCanvasSummary = (canvasId: string) => {
    setCanvasRecords((items) => items.filter((item) => item.id !== canvasId));
  };

  async function renameCanvasRecord(canvas: CanvasSummary) {
    const nextTitle = window.prompt("Rename canvas", canvas.title)?.trim();

    if (!nextTitle || nextTitle === canvas.title) {
      return;
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("teaching_canvases")
      .update({ title: nextTitle, topic: canvas.topic || nextTitle })
      .eq("id", canvas.id)
      .select(
        "id, title, subject, template_key, updated_at, status, share_slug, is_public, topic",
      )
      .single();

    if (error || !data) {
      appendLog(`Could not rename ${canvas.title}.`);
      return;
    }

    updateCanvasSummary(mapCanvasSummary(data));

    if (activeCanvasId === canvas.id) {
      setCanvasDocument((current) => withCanvasTitle(current, data.title));
    }

    appendLog(`Renamed ${canvas.title} to ${data.title}.`);
  }

  async function deleteCanvasRecord(canvas: CanvasSummary) {
    const shouldDelete = window.confirm(
      `Delete "${canvas.title}"? This cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from("teaching_canvases")
      .delete()
      .eq("id", canvas.id);

    if (error) {
      appendLog(`Could not delete ${canvas.title}.`);
      return;
    }

    removeCanvasSummary(canvas.id);
    appendLog(`Deleted ${canvas.title}.`);

    if (activeCanvasId === canvas.id) {
      startTransition(() => router.push("/dashboard/canvas"));
    }
  }

  async function persistCanvas(nextDocument = canvasDocument) {
    if (!activeCanvasId) {
      return;
    }

    const title = nextDocument.root?.props?.title?.trim() || "Untitled canvas";
    setSaveStatus("Saving...");

    const response = await fetch(`/api/canvas/${activeCanvasId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activeFrameId: activeSlideId,
        document: nextDocument,
        templateKey: activeTemplateKey,
        title,
        topic: activeTopic.trim() || title,
      }),
    });
    const result = (await response.json().catch(() => null)) as {
      canvas?: Parameters<typeof mapCanvasSummary>[0];
      error?: string;
    } | null;

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
    updateCanvasSummary(mapCanvasSummary(result.canvas));
    appendLog("Saved the canvas draft.");
    toastManager.add({
      title: "Canvas saved",
      description: "Frames, content, and appearance are up to date.",
      type: "success",
    });
  }

  const debouncedPersistTitle = useDebouncedCallback(
    (nextTitle: string) => {
      if (!activeCanvasId) {
        return;
      }

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

  const createCanvasFromTemplate = async () => {
    setTemplateError(null);
    const template = createCanvasTemplate(selectedTemplateKey);
    const nextDocument = normalizeCanvasFrames(template.document);
    const title = topicSearch.trim() || template.title;
    const topic = topicSearch.trim() || template.title;
    const supabase = createSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setTemplateError("Please sign in again before creating a canvas.");
      return;
    }

    const payload = buildCanvasPayload({
      activeFrameId: getInitialSlideId(nextDocument),
      document: nextDocument,
      templateKey: selectedTemplateKey,
      title,
      topic,
    });

    const { data, error } = await supabase
      .from("teaching_canvases")
      .insert({
        ...payload,
        owner_id: user.id,
        share_slug: createShareSlug(),
      })
      .select("id")
      .single();

    if (error || !data) {
      setTemplateError(error?.message ?? "Could not create the canvas yet.");
      console.error("Error creating canvas:", error);
      return;
    }

    appendLog(`Created ${title}.`);
    setIsTemplateDialogOpen(false);
    startTransition(() => router.push(`/dashboard/canvas/${data.id}`));
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
    if (!activeCanvasId) {
      return;
    }

    const response = await fetch(`/api/canvas/${activeCanvasId}`, {
      method: "POST",
    });
    const result = (await response.json().catch(() => null)) as {
      canvas?: { is_public: boolean; share_slug: string };
      error?: string;
    } | null;

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

  const getPublicLink = () => {
    if (!shareSlug || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/canvas/shared/${shareSlug}`;
  };

  const copyPublicLink = async () => {
    const publicLink = getPublicLink();

    if (!publicLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicLink);
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

  const downloadAsPdf = () => {
    const previewElement = window.document.querySelector(
      ".canvas-preview-pane [data-puck-preview]",
    ) as HTMLElement | null;

    if (!previewElement) {
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=1280,height=900",
    );
    if (!printWindow) {
      return;
    }

    const styles = Array.from(
      window.document.querySelectorAll('style, link[rel="stylesheet"]'),
    )
      .map((node) => node.outerHTML)
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>${canvasDocument.root?.props?.title ?? "Canvas export"}</title>
          ${styles}
          <style>
            body { margin: 0; padding: 24px; background: #edf0f5; }
          </style>
        </head>
        <body>${previewElement.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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

  if (isLibraryView) {
    return (
      <section className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden bg-background px-5 py-6 text-foreground">
        {/* <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Canvas library
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              Teaching canvases
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label={
                isLightTheme ? "Switch to dark theme" : "Switch to light theme"
              }
              onClick={() => setTheme(isLightTheme ? "dark" : "light")}
            >
              {isLightTheme ? (
                <MoonIcon className="size-4" />
              ) : (
                <SunIcon className="size-4" />
              )}
            </Button>
            <Button onClick={() => setIsTemplateDialogOpen(true)}>
              <PlusIcon className="size-4" />
              New canvas
            </Button>
          </div>
        </header> */}
        <div className="flex flex-col gap-4  py-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-">
            {/* <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
              Canvas library
            </p> */}
            <div className="flex items-center gap-2">
              {/* <div className="grid size-12 place-items-center "> */}
              <PiChalkboardDuotone className="size-8" />
              {/* </div> */}
              <h1 className="text-3xl font-semibold tracking-tight">
                Teaching canvases
              </h1>
            </div>
          </div>

          {/* <div className="flex flex-wrap gap-3">
            <Button onClick={() => setIsTemplateDialogOpen(true)}>
              <PlusIcon className="size-4" />
              New canvas
            </Button>
            <Button
              variant="outline"
              render={<Link href="/dashboard/session/new" />}
            >
              <PenLineIcon className="size-4" />
              New session
            </Button>
          </div> */}
        </div>
        <section className="flex gap-2">
          {[
            {
              title: "Arrays",
              image: "/templates/image-removebg-preview(7).png",
            },

            {
              title: "Objects",
              image: "/templates/image-removebg-preview (8).png",
            },
            {
              title: "OPPS",
              image: "/templates/image-removebg-preview(7).png",
            },
          ].map((template, index) => (
            <div
              key={index}
              className="w-64 h-24 overflow-hidden rounded-lg bg-card flex justify-between items-center px-2 pl-4"
            >
              <p className="text-base font-semibold text-foreground">
                {template.title}
              </p>
              <Image
                src={template.image}
                alt={template.title}
                width={126}
                height={68}
                className="rounded-lg"
              />
            </div>
          ))}
        </section>

        <CardFrame className="w-full mt-4">
          <CardFrameHeader>
            <CardFrameTitle>Existing canvases</CardFrameTitle>
            <CardFrameDescription>
              Open an existing lesson canvas or start a new one.
            </CardFrameDescription>
            <CardFrameAction>
              <Button
                variant="default"
                onClick={() => setIsTemplateDialogOpen(true)}
              >
                <PlusIcon className="size-4" />
                New canvas
              </Button>
            </CardFrameAction>
          </CardFrameHeader>
          <Card>
            <CardPanel>
              <div className="grid gap-2">
                {canvasRecords.length ? (
                  canvasRecords.map((canvas) => (
                    <div
                      key={canvas.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 transition hover:border-primary/50 hover:bg-accent/40"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          startTransition(() =>
                            router.push(`/dashboard/canvas/${canvas.id}`),
                          )
                        }
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-border bg-muted/25 text-primary">
                          <PiChalkboardDuotone className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {canvas.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {canvas.topic || "Computer Science"} ·{" "}
                            {formatUpdatedAt(canvas.updatedAt)}
                          </p>
                        </div>
                      </button>

                      <Menu>
                        <MenuTrigger
                          render={
                            <button
                              type="button"
                              aria-label={`${canvas.title} actions`}
                              className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
                            />
                          }
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </MenuTrigger>
                        <MenuPopup
                          align="end"
                          side="bottom"
                          className="min-w-40"
                        >
                          <MenuItem
                            onClick={() => void renameCanvasRecord(canvas)}
                          >
                            <PenLineIcon className="size-4" />
                            Rename
                          </MenuItem>
                          <MenuItem
                            variant="destructive"
                            onClick={() => void deleteCanvasRecord(canvas)}
                          >
                            <Trash2Icon className="size-4" />
                            Delete
                          </MenuItem>
                        </MenuPopup>
                      </Menu>
                    </div>
                  ))
                ) : (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <FolderIcon />
                      </EmptyMedia>
                      <EmptyTitle>No projects yet</EmptyTitle>
                      <EmptyDescription>
                        Get started by adding your first project.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </div>
            </CardPanel>
          </Card>
        </CardFrame>

        <div className="grid- min-h-0 w-full flex-1 gap-6 py-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          {/* <aside className="rounded-2xl border border-border bg-card/70 p-5">
            <p className="text-sm font-semibold">New canvas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Search a topic first, then choose a starter template.
            </p>
            <div className="mt-4 grid gap-3">
              <Label htmlFor="library-topic-search">Search topic or subject</Label>
              <Input
                id="library-topic-search"
                value={topicSearch}
                onChange={(event) => setTopicSearch(event.target.value)}
                placeholder="Arrays, linked list, recursion, complexity..."
              />
              <Button onClick={() => setIsTemplateDialogOpen(true)}>
                <SparklesIcon className="size-4" />
                Pick template
              </Button>
              {templateError ? <p className="text-sm text-destructive">{templateError}</p> : null}
            </div>
          </aside> */}
        </div>

        <Dialog
          open={isTemplateDialogOpen}
          onOpenChange={setIsTemplateDialogOpen}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PiChalkboardDuotone className="size-6" />
                Create canvas
              </DialogTitle>
              <DialogDescription>
                Search a Computer Science topic, then choose the template that
                should open in the editor.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 px-6 pb-2">
              <div className="grid gap-2">
                <Label htmlFor="canvas-topic-search">Topic search</Label>
                <InputGroup>
                  <InputGroupAddon>
                    <SearchIcon aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label="Search"
                    placeholder="Search"
                    type="search"
                    value={topicSearch}
                    onChange={(event) => setTopicSearch(event.target.value)}
                  />
                </InputGroup>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {filteredTemplates.map((template) => {
                  const isSelected = selectedTemplateKey === template.key;

                  return (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => setSelectedTemplateKey(template.key)}
                      className={cn(
                        "min-h-36 rounded-xl border p-4 text-left transition hover:bg-accent",
                        isSelected
                          ? "border-primary bg-primary/8 ring-2 ring-primary/18"
                          : "border-border bg-background",
                      )}
                    >
                      <p className="font-semibold tracking-tight">
                        {template.title}
                      </p>
                      <p className="mt-2 text-sm leading-5 text-muted-foreground">
                        {template.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              {templateError ? (
                <p className="text-sm text-destructive">{templateError}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsTemplateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={createCanvasFromTemplate} disabled={isPending}>
                {isPending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : (
                  <PlusIcon className="size-4" />
                )}
                Open editor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    );
  }

  return (
    <section
      aria-label="Canvas editor"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground"
    >
      <Puck<typeof canvasPuckConfig>
        key={`canvas-${puckRevision}`}
        config={canvasPuckConfig}
        data={canvasDocument}
        height="100%"
        iframe={{ enabled: false }}
        overrides={canvasPuckOverrides}
        onChange={(nextDocument) => {
          setCanvasDocument(normalizeCanvasFrames(nextDocument));
          setSaveStatus("Unsaved changes");
        }}
        onPublish={(nextDocument) => {
          void persistCanvas(nextDocument);
        }}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-2xl border border-border bg-muted/20 text-primary">
                <Logo />
              </div>
              <div className="min-w-0">
                {isTitleEditing ? (
                  <Input
                    autoFocus
                    value={
                      canvasDocument.root?.props?.title ?? "Untitled canvas"
                    }
                    onBlur={() => {
                      setIsTitleEditing(false);
                      debouncedPersistTitle.flush();
                    }}
                    onChange={(event) =>
                      handleCanvasTitleChange(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        setIsTitleEditing(false);
                        debouncedPersistTitle.flush();
                      }
                    }}
                    className="h-8 max-w-sm text-sm font-semibold"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsTitleEditing(true)}
                    className="truncate text-left text-sm font-semibold transition hover:text-primary"
                  >
                    {canvasDocument.root?.props?.title ?? "Untitled canvas"}
                  </button>
                )}
                <p className="text-xs text-muted-foreground">{saveStatus}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setIsStartClassOpen(true)}>
                <PresentationIcon className="size-4" />
                Start class
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void persistCanvas()}
              >
                <SaveIcon className="size-4" />
                Save draft
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsShareDialogOpen(true)}
              >
                <Share2Icon className="size-4" />
                Share
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label={
                  isLightTheme
                    ? "Switch to dark theme"
                    : "Switch to light theme"
                }
                onClick={() => setTheme(isLightTheme ? "dark" : "light")}
              >
                {isLightTheme ? (
                  <MoonIcon className="size-4" />
                ) : (
                  <SunIcon className="size-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={
                  aiPanelOpen ? "Collapse inspector" : "Expand inspector"
                }
                onClick={() => setAiPanelOpen((open) => !open)}
              >
                <PanelRightIcon className="size-4" />
              </Button>
            </div>
          </header>

          <div
            className="grid min-h-0 flex-1 overflow-hidden"
            style={{ gridTemplateColumns }}
          >
            <aside
              aria-label="Tool rail"
              className="flex min-h-0 flex-col border-r border-border bg-muted/20"
            >
              {/* <div className="px-2 pt-3">
                <button
                  type="button"
                  aria-label="Back to dashboard"
                  onClick={() =>
                    startTransition(() => router.push("/dashboard"))
                  }
                  className="mb-2 inline-flex size-12 items-center justify-center rounded-2xl border border-border bg-background transition hover:bg-accent"
                >
                  <Image
                    src="/unlockpi-logo.png"
                    alt="Unlock PI"
                    width={28}
                    height={28}
                    className="size-7 rounded-md object-cover"
                  />
                </button>
              </div> */}

              <ScrollArea className="min-h-0 flex-1" scrollFade scrollbarGutter>
                <div className="grid gap-2 px-2 pb-3 ml-3 mt-5">
                  {leftPanelItems.map((item) => (
                    <Button
                      key={item.id}
                      aria-label={item.label}
                      size="icon"
                      title={item.label}
                      variant={
                        leftPanelView === item.id ? "secondary" : "ghost"
                      }
                      className="h-10 w-full"
                      onClick={() => {
                        setLeftPanelView(item.id);
                        setToolPanelOpen(true);
                      }}
                    >
                      <item.icon className="size-4" />
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </aside>

            {showToolPanel ? (
              <aside
                aria-label={`${leftPanelCopy[leftPanelView].title} tool panel`}
                className="min-h-0 border-r border-border bg-background lg:flex lg:flex-col"
              >
                <div className="border-b border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {leftPanelCopy[leftPanelView].title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {leftPanelCopy[leftPanelView].description}
                      </p>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Collapse left panel"
                      onClick={() => setToolPanelOpen(false)}
                    >
                      <ChevronLeftIcon className="size-4" />
                    </Button>
                  </div>
                </div>

                <ScrollArea
                  className="min-h-0 flex-1"
                  scrollFade
                  scrollbarGutter
                >
                  <div className="p-3">
                    {leftPanelView === "home" ? (
                      <div className="grid gap-5">
                        <div className="canvas-component-palette">
                          <Puck.Components />
                        </div>
                      </div>
                    ) : null}

                    {leftPanelView === "frames" ? (
                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={() => applyAction({ action: "add_frame" })}
                          className="flex min-h-11 items-center justify-between rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-left text-xs transition hover:border-primary hover:bg-primary/8"
                        >
                          <span className="font-semibold">Add frame</span>
                          <PlusIcon className="size-4 text-muted-foreground" />
                        </button>

                        {frames.map((frame, index) => (
                          <button
                            key={frame.id}
                            type="button"
                            onClick={() =>
                              applyAction({
                                action: "go_to_frame",
                                frameIndex: index,
                              })
                            }
                            className={cn(
                              "rounded-lg border p-2 text-left text-xs transition hover:bg-accent",
                              activeSlideId === frame.id
                                ? "border-primary bg-primary/8"
                                : "border-border bg-background",
                            )}
                          >
                            <span className="font-semibold">
                              Frame {index + 1}
                            </span>
                            <span className="mt-1 block truncate text-muted-foreground">
                              {frame.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {leftPanelView === "changes" ? (
                      <div className="grid gap-2">
                        {actionLog.map((item) => (
                          <p
                            key={item.id}
                            className="rounded-lg border border-border bg-muted/30 p-2 text-xs"
                          >
                            {item.message}
                          </p>
                        ))}
                      </div>
                    ) : null}

                    {leftPanelView === "commands" ? (
                      <div className="grid gap-3">
                        <Label htmlFor="canvas-command-left">
                          Command JSON
                        </Label>
                        <Textarea
                          id="canvas-command-left"
                          value={commandDraft}
                          onChange={(event) =>
                            setCommandDraft(event.target.value)
                          }
                          className="min-h-36 font-mono text-xs"
                        />
                        {commandError ? (
                          <p className="text-xs text-destructive">
                            {commandError}
                          </p>
                        ) : null}
                        <Button onClick={runJsonCommand}>
                          <BracesIcon className="size-4" />
                          Run command
                        </Button>
                      </div>
                    ) : null}

                    {leftPanelView === "voice" ? (
                      <div className="grid gap-2">
                        {quickCommands.map((command) => (
                          <Button
                            key={command.label}
                            variant="outline"
                            className="justify-start"
                            onClick={() => applyAction(command.action)}
                          >
                            {command.label}
                          </Button>
                        ))}
                      </div>
                    ) : null}

                    {leftPanelView === "theme" ? (
                      <div className="grid gap-6">
                        <section>
                          <div className="mb-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Frame theme
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              One palette is applied to every frame, including
                              presentation mode.
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {canvasThemeOptions.map((theme) => {
                              const isActive = activeCanvasTheme === theme.id;
                              return (
                                <button
                                  key={theme.id}
                                  type="button"
                                  aria-pressed={isActive}
                                  onClick={() =>
                                    updateCanvasAppearance({ theme: theme.id })
                                  }
                                  className={cn(
                                    "group relative min-h-28 rounded-xl p-2.5 text-left shadow-sm outline-none transition-[transform,box-shadow,background-color] active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ring",
                                    isActive
                                      ? "bg-primary/8 shadow-[inset_0_0_0_1.5px_var(--primary)]"
                                      : "bg-muted/35 shadow-[inset_0_0_0_1px_var(--border)] hover:bg-muted/60",
                                  )}
                                >
                                  <div className="flex h-12 overflow-hidden rounded-lg shadow-[0_5px_14px_rgba(0,0,0,0.09)] ring-1 ring-black/10 dark:ring-white/10">
                                    {theme.colors.map((color) => (
                                      <span
                                        key={color}
                                        className="h-full flex-1"
                                        style={{ backgroundColor: color }}
                                      />
                                    ))}
                                  </div>
                                  <div className="mt-2 flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold">
                                      {theme.name}
                                    </span>
                                    <CheckIcon
                                      className={cn(
                                        "size-3.5 text-primary transition-[opacity,scale,filter] duration-200",
                                        isActive
                                          ? "scale-100 opacity-100 blur-0"
                                          : "scale-25 opacity-0 blur-[4px]",
                                      )}
                                    />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </section>

                        <section>
                          <div className="mb-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Typography size
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              A fixed sans-serif system keeps every lesson
                              consistent.
                            </p>
                          </div>
                          <div className="grid gap-2">
                            {canvasTypographyOptions.map((scale) => {
                              const isActive =
                                activeTypographyScale === scale.id;
                              return (
                                <button
                                  key={scale.id}
                                  type="button"
                                  aria-pressed={isActive}
                                  onClick={() =>
                                    updateCanvasAppearance({
                                      typographyScale: scale.id,
                                    })
                                  }
                                  className={cn(
                                    "flex min-h-16 items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-[transform,box-shadow,background-color] active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ring",
                                    isActive
                                      ? "bg-primary/8 shadow-[inset_0_0_0_1.5px_var(--primary)]"
                                      : "bg-muted/35 shadow-[inset_0_0_0_1px_var(--border)] hover:bg-muted/60",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "grid size-10 shrink-0 place-items-center rounded-lg bg-background font-sans font-semibold shadow-sm",
                                      scale.previewSize,
                                    )}
                                  >
                                    Aa
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-xs font-semibold">
                                      {scale.name}
                                    </span>
                                    <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">
                                      {scale.description}
                                    </span>
                                  </span>
                                  <CheckIcon
                                    className={cn(
                                      "size-3.5 shrink-0 text-primary transition-[opacity,scale,filter] duration-200",
                                      isActive
                                        ? "scale-100 opacity-100 blur-0"
                                        : "scale-25 opacity-0 blur-[4px]",
                                    )}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      </div>
                    ) : null}

                    {leftPanelView === "templates" ? (
                      <div className="grid gap-2">
                        {canvasTemplateOptions.map((template) => (
                          <button
                            key={template.key}
                            type="button"
                            onClick={() => {
                              setSelectedTemplateKey(template.key);
                              setTopicSearch(template.title);
                              setIsTemplateDialogOpen(true);
                            }}
                            className="rounded-xl border border-border bg-background p-3 text-left transition hover:bg-accent"
                          >
                            <p className="text-sm font-semibold">
                              {template.title}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {template.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </ScrollArea>
              </aside>
            ) : null}

            <main
              aria-label="Canvas stage"
              className="canvas-preview-pane min-h-0 overflow-hidden bg-[#edf0f5] dark:bg-[#050607]"
            >
              <ScrollArea className="min-h-0 h-full" scrollFade scrollbarGutter>
                <div
                  className="box-border min-h-full py-4"
                  onClick={handleFrameChromeAction}
                  onDoubleClickCapture={() => setAiPanelOpen(true)}
                >
                  <Puck.Preview />
                </div>
              </ScrollArea>
            </main>

            {showAiPanel ? (
              <aside
                aria-label="Inspector"
                className="min-h-0 border-l border-border bg-background lg:flex lg:flex-col"
              >
                <div className="border-b border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <BotIcon className="size-4 text-primary" />
                      <p className="text-sm font-semibold">Inspector</p>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Collapse inspector"
                      onClick={() => setAiPanelOpen(false)}
                    >
                      <ChevronRightIcon className="size-4" />
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Edit the selected block and review live screen context.
                  </p>
                </div>

                <ScrollArea
                  className="min-h-0 flex-1"
                  scrollFade
                  scrollbarGutter
                >
                  <div className="grid gap-4 p-4">
                    <div className="rounded-lg border border-border">
                      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Selected block
                      </div>
                      <div className="p-3">
                        <Puck.Fields />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="screen-context">Screen context</Label>
                      <Textarea
                        id="screen-context"
                        readOnly
                        value={screenContext}
                        className="min-h-32 text-xs"
                      />
                    </div>
                  </div>
                </ScrollArea>
              </aside>
            ) : null}
          </div>
        </div>
      </Puck>

      {presentationMode ? (
        <CanvasPresenter
          canvasId={activeCanvasId}
          document={canvasDocument}
          initialFrameId={activeSlideId}
          mode={presentationMode}
          onClose={() => setPresentationMode(null)}
          title={canvasDocument.root?.props?.title ?? "Untitled canvas"}
        />
      ) : null}

      <Dialog open={isStartClassOpen} onOpenChange={setIsStartClassOpen}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Start class</DialogTitle>
            <DialogDescription>
              Open the classroom first, then connect the AI when you are ready.
              You can switch modes or disconnect without ending the class.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setPresentationMode("voice");
                setIsStartClassOpen(false);
                void persistCanvas();
              }}
              className="rounded-2xl border border-primary bg-primary/8 p-5 text-left transition hover:bg-primary/12"
            >
              <div className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
                <MicIcon className="size-4" />
              </div>
              <p className="mt-5 font-semibold">Voice Director</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Silent AI listens to your teaching and finds or changes frames
                when you ask naturally.
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setPresentationMode("companion");
                setIsStartClassOpen(false);
                void persistCanvas();
              }}
              className="rounded-2xl border border-border bg-card p-5 text-left transition hover:bg-accent"
            >
              <div className="grid size-10 place-items-center rounded-full bg-muted text-foreground">
                <BotIcon className="size-4" />
              </div>
              <p className="mt-5 font-semibold">AI Companion</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                A concise spoken co-teacher that can answer, navigate, and
                create temporary visual examples during class.
              </p>
            </button>
          </DialogPanel>
        </DialogPopup>
      </Dialog>

      {/* <Dialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create canvas</DialogTitle>
            <DialogDescription>
              Search a Computer Science topic, then choose the template that
              should open in the editor.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 px-6 pb-2">
            <div className="grid gap-2">
              <Label htmlFor="canvas-topic-search-editor">Topic search</Label>
              <Input
                id="canvas-topic-search-editor"
                value={topicSearch}
                onChange={(event) => setTopicSearch(event.target.value)}
                placeholder="Search topic or subject"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {filteredTemplates.map((template) => {
                const isSelected = selectedTemplateKey === template.key;

                return (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => setSelectedTemplateKey(template.key)}
                    className={cn(
                      "min-h-36 rounded-xl border p-4 text-left transition hover:bg-accent",
                      isSelected
                        ? "border-primary bg-primary/8 ring-2 ring-primary/18"
                        : "border-border bg-background",
                    )}
                  >
                    <p className="font-semibold tracking-tight">
                      {template.title}
                    </p>
                    <p className="mt-2 text-sm leading-5 text-muted-foreground">
                      {template.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={createCanvasFromTemplate} disabled={isPending}>
              {isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                <SparklesIcon className="size-4" />
              )}
              New canvas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        {/* <DialogTrigger>Share canvas</DialogTrigger> */}
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Share canvas</DialogTitle>
            <DialogDescription>
              Share to create a public link, or export the full canvas as a PDF
              from the browser.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="grid gap-4">
            <div className="rounded-xl border border-border bg-muted/20 py-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">
                  Share to create a public link
                </p>

                {/* <p className="mt-1 text-xs text-muted-foreground">
                Turn this canvas into a public read-only link for teaching and
                review.
              </p> */}
                <Popover>
                  <PopoverTrigger
                    openOnHover
                    render={
                      <Button
                        aria-label="Password requirements"
                        size="icon-xs"
                        variant="ghost"
                      />
                    }
                  >
                    <InfoIcon />
                  </PopoverTrigger>
                  <PopoverPopup side="top" tooltipStyle>
                    <p>
                      Turn this canvas into a public read-only link for teaching
                      and review.
                    </p>
                  </PopoverPopup>
                </Popover>
              </div>
              <div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void handleCreatePublicLink()}
                  >
                    <Share2Icon className="size-4" />
                    {isPublic ? "Refresh public link" : "Create public link"}
                  </Button>
                  {/* {shareSlug ? (
                  <Button
                    variant="outline"
                    onClick={() => void copyPublicLink()}
                  >
                    <CopyIcon className="size-4" />
                    Copy link
                  </Button>
                ) : null} */}
                </div>
                {/* {shareSlug ? (
                <Input className="mt-3" readOnly value={getPublicLink()} />
              ) : null} */}
                {shareError ? (
                  <p className="mt-2 text-xs text-destructive">{shareError}</p>
                ) : null}
                <InputGroup>
                  <InputGroupAddon>
                    {/* {isLoading ? (
                    <LoaderCircleIcon
                      aria-label="Loading..."
                      className="animate-spin"
                      role="status"
                    />
                  ) : (
                    <SearchIcon aria-hidden="true" />
                  )} */}
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label="Search"
                    // onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Search..."
                    type="search"
                    readOnly
                    value={getPublicLink()}
                  />
                  <InputGroupAddon align="inline-end">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            aria-label="Voice search"
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => void copyPublicLink()}
                          />
                        }
                      >
                        {shareSlug ? (
                          copySuccess ? (
                            <CheckIcon className="size-4 text-green-500" />
                          ) : (
                            <CopyIcon className="size-4" />
                          )
                        ) : null}
                      </TooltipTrigger>
                      <TooltipPopup>Voice search</TooltipPopup>
                    </Tooltip>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>
          </DialogPanel>
          <DialogFooter className="block">
            <div className="rounded-xl border border-border bg-muted/20 py-4">
              {/* <p className="text-sm font-semibold">Download as PDF</p> */}
              {/* <p className="mt-1 text-xs text-muted-foreground">
                This opens the browser print flow so you can save the full
                canvas as a PDF.
              </p> */}
              <Button
                className="mt-3 w-full"
                variant="default"
                onClick={downloadAsPdf}
              >
                <SaveIcon className="size-4" />
                Download as PDF
              </Button>
            </div>
            {/* <DialogClose>Close</DialogClose> */}
          </DialogFooter>
        </DialogPopup>
      </Dialog>
      {/* <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Share canvas</DialogTitle>
            <DialogDescription>
              Share to create a public link, or export the full canvas as a PDF
              from the browser.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog> */}
    </section>
  );
}
