import type {
  CanvasDocument,
  CanvasSubject,
  CanvasTemplateKey,
} from "@/features/canvas/types/canvas-types";
import { DEFAULT_CANVAS_THEME } from "@/features/canvas/lib/canvas-theme";

export type CanvasStatus = "draft" | "ready" | "presenting" | "archived";

export type CanvasSummary = {
  id: string;
  isPublic: boolean;
  projectId: string | null;
  shareSlug: string | null;
  status: CanvasStatus;
  subject: CanvasSubject;
  templateKey: CanvasTemplateKey | null;
  title: string;
  topic: string | null;
  updatedAt: string;
};

export type CanvasRecord = CanvasSummary & {
  activeFrameId: string | null;
  document: CanvasDocument;
};

type CanvasRow = {
  active_frame_id?: string | null;
  document?: CanvasDocument | null;
  id: string;
  is_public?: boolean | null;
  project_id?: string | null;
  share_slug?: string | null;
  status?: string | null;
  subject?: string | null;
  template_key?: string | null;
  title: string;
  topic?: string | null;
  updated_at?: string | null;
};

function normalizeTemplateKey(value: string | null | undefined): CanvasTemplateKey | null {
  if (
    value === "array-intro" ||
    value === "array-operations" ||
    value === "linked-list-basics" ||
    value === "complexity-basics" ||
    value === "recursion-basics" ||
    value === "empty"
  ) {
    return value;
  }

  return null;
}

function normalizeStatus(value: string | null | undefined): CanvasStatus {
  if (value === "ready" || value === "presenting" || value === "archived") {
    return value;
  }

  return "draft";
}

function normalizeSubject(value: string | null | undefined): CanvasSubject {
  return value === "computer_science" ? value : "computer_science";
}

export function mapCanvasSummary(row: CanvasRow): CanvasSummary {
  return {
    id: row.id,
    isPublic: Boolean(row.is_public),
    projectId: row.project_id ?? null,
    shareSlug: row.share_slug ?? null,
    status: normalizeStatus(row.status),
    subject: normalizeSubject(row.subject),
    templateKey: normalizeTemplateKey(row.template_key),
    title: row.title,
    topic: row.topic ?? null,
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

export function mapCanvasRecord(row: CanvasRow): CanvasRecord {
  return {
    ...mapCanvasSummary(row),
    activeFrameId: row.active_frame_id ?? null,
    document:
      row.document ?? {
        root: {
          props: {
            subject: "computer_science",
            title: row.title,
            theme: DEFAULT_CANVAS_THEME,
            typographyScale: "base",
          },
        },
        content: [],
      },
  };
}
