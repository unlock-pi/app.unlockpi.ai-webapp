import {
  BoxesIcon,
  BracesIcon,
  Clock3Icon,
  LayoutPanelTopIcon,
  MicIcon,
  PaletteIcon,
  type LucideIcon,
} from "lucide-react";

import { getInitialSlideId } from "@/features/canvas/lib/canvas-commands";
import type { CanvasSummary } from "@/features/canvas/lib/canvas-records";
import type {
  CanvasAiAction,
  CanvasDocument,
  CanvasTemplateKey,
} from "@/features/canvas/types/canvas-types";
import type {
  FrameSummary,
  LeftPanelCopy,
  LeftPanelItem,
  LeftPanelView,
} from "@/features/canvas/types/canvas-other-types";
import {
  DEFAULT_CANVAS_THEME,
  DEFAULT_CANVAS_TYPOGRAPHY_SCALE,
} from "@/features/canvas/lib/canvas-theme";

export const leftPanelItems: LeftPanelItem[] = [
  { id: "home", label: "Insert", icon: BoxesIcon as LucideIcon },
  { id: "frames", label: "Frames", icon: LayoutPanelTopIcon as LucideIcon },
  { id: "changes", label: "Recent changes", icon: Clock3Icon as LucideIcon },
  { id: "commands", label: "Command JSON", icon: BracesIcon as LucideIcon },
  { id: "voice", label: "Quick voice", icon: MicIcon as LucideIcon },
  { id: "theme", label: "Theme", icon: PaletteIcon as LucideIcon },
];

export const easyModeHiddenLeftPanelViews: LeftPanelView[] = [
  "changes",
  "commands",
  "voice",
];

export const leftPanelCopy: LeftPanelCopy = {
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

export const quickCommands: Array<{ label: string; action: CanvasAiAction }> = [
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

const updatedAtFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatUpdatedAt(value: string) {
  return updatedAtFormatter.format(new Date(value));
}

export function createShareSlug() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12).toLowerCase();
}

export function withCanvasTitle(
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

export function buildCanvasPayload({
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

export function getFrameSummaries(document: CanvasDocument): FrameSummary[] {
  return document.content
    .filter((item) => item.type === "SlideBlock")
    .map((item) => ({
      id: item.props.id,
      title: item.props.title,
    }));
}

export function getCanvasTitle(document: CanvasDocument) {
  return document.root?.props?.title?.trim() || "Untitled canvas";
}

export function getCanvasTopic(document: CanvasDocument, fallbackTopic: string) {
  const title = getCanvasTitle(document);
  return fallbackTopic.trim() || title;
}

export function getInitialCanvasDocument(document: CanvasDocument) {
  return {
    document,
    activeFrameId: getInitialSlideId(document),
  };
}

export const EMPTY_CANVASES: CanvasSummary[] = [];
