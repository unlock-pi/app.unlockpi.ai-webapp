"use client";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { CanvasMiniPreview } from "@/features/project/components/canvas-mini-preview";
import {
  formatOpenedRelative,
  type TeachingCanvasPreview,
} from "@/features/project/lib/canvas-preview";

type CanvasCardProps = {
  canvas: TeachingCanvasPreview;
  projectName?: string | null;
};

/** Box-layout canvas tile: thumbnail on top, title + context line below. */
export function CanvasBoxCard({ canvas, projectName }: CanvasCardProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/dashboard/canvas/${canvas.id}`)}
      className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-background text-left transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <CanvasMiniPreview
        document={canvas.document}
        className="aspect-[4/3] w-full border-b border-border/60"
      />
      <div className="space-y-0.5 p-2.5">
        <p className="truncate text-xs font-semibold text-foreground">
          {canvas.title}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {projectName ? `${projectName} • ` : ""}
          {formatOpenedRelative(canvas.updated_at)}
        </p>
      </div>
    </button>
  );
}

/** List-layout canvas row — mirrors the row used on /dashboard/canvas. */
export function CanvasListRow({ canvas, projectName }: CanvasCardProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 transition hover:border-primary/50 hover:bg-accent/40">
      <button
        type="button"
        onClick={() => router.push(`/dashboard/canvas/${canvas.id}`)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
      >
        <CanvasMiniPreview
          document={canvas.document}
          className="size-10 shrink-0 rounded-2xl border border-border"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{canvas.title}</p>
          <div className="mt-1 flex items-center gap-1.5">
            {projectName ? (
              <Badge variant="secondary">{projectName}</Badge>
            ) : null}
            <p className="truncate text-xs text-muted-foreground">
              {formatOpenedRelative(canvas.updated_at)}
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
