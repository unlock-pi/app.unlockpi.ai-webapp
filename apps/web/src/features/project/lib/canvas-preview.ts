import type { CanvasDocument } from "@/features/canvas/types/canvas-types";

export type TeachingCanvasPreview = {
  id: string;
  project_id: string | null;
  title: string;
  updated_at: string;
  document: CanvasDocument | null;
};

export type CanvasPreviewItem = {
  type: string;
  props: Record<string, unknown>;
};

/** First few blocks of a canvas's first frame — enough to sketch a thumbnail. */
export function getFirstFramePreviewItems(
  document: CanvasDocument | null | undefined,
  limit = 4,
): CanvasPreviewItem[] {
  if (!document || !Array.isArray(document.content)) {
    return [];
  }

  const firstSlide = document.content.find((item) => item.type === "SlideBlock") as
    | { type: "SlideBlock"; props: { content?: unknown } }
    | undefined;

  const nested = firstSlide?.props?.content;
  if (!Array.isArray(nested)) {
    return [];
  }

  return nested.slice(0, limit) as CanvasPreviewItem[];
}

function pluralize(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}

/** "Opened 2 hours ago" style relative label for canvas cards. */
export function formatOpenedRelative(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1) return "Opened just now";
  if (diffMinutes < 60) return `Opened ${pluralize(diffMinutes, "minute")}`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Opened ${pluralize(diffHours, "hour")}`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `Opened ${pluralize(diffDays, "day")}`;

  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) return `Opened ${pluralize(diffWeeks, "week")}`;

  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `Opened ${pluralize(diffMonths, "month")}`;

  const diffYears = Math.round(diffDays / 365);
  return `Opened ${pluralize(diffYears, "year")}`;
}
