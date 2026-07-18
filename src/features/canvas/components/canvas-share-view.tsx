"use client";

import { Render } from "@puckeditor/core";
import { ChevronRightIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import Logo from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { canvasPuckConfig } from "@/features/canvas/components/canvas-puck-config";
import { getCanvasAppThemeVars } from "@/features/canvas/components/canvas-puck-overrides";
import { getCanvasPresentationFrames } from "@/features/canvas/lib/canvas-presentation";
import type { CanvasRecord } from "@/features/canvas/lib/canvas-records";
import {
  DEFAULT_CANVAS_THEME,
  DEFAULT_CANVAS_TYPOGRAPHY_SCALE,
  getCanvasThemeStyle,
} from "@/features/canvas/lib/canvas-theme";
import type {
  CanvasThemeId,
  CanvasTypographyScale,
} from "@/features/canvas/types/canvas-types";
import { cn } from "@/lib/utils";

function formatTopic(topic: string | null) {
  if (!topic) {
    return "Computer Science";
  }

  return topic
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function CanvasShareView({ canvas }: { canvas: CanvasRecord }) {
  const frames = useMemo(
    () => getCanvasPresentationFrames(canvas.document),
    [canvas.document],
  );
  const rootProps = canvas.document.root?.props;
  const theme = (rootProps?.theme ?? DEFAULT_CANVAS_THEME) as CanvasThemeId;
  const typographyScale = (rootProps?.typographyScale ??
    DEFAULT_CANVAS_TYPOGRAPHY_SCALE) as CanvasTypographyScale;
  const [activeFrameId, setActiveFrameId] = useState<string | null>(
    canvas.activeFrameId ?? frames[0]?.id ?? null,
  );
  const activeFrameIndex = Math.max(
    0,
    frames.findIndex((frame) => frame.id === activeFrameId),
  );
  const frameRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const stageScrollRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!frames.length) {
      return;
    }

    const viewport = stageScrollRootRef.current?.querySelector<HTMLDivElement>(
      '[data-slot="scroll-area-viewport"]',
    );

    if (!viewport) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) => right.intersectionRatio - left.intersectionRatio,
          );

        const nextFrameId = visibleEntries[0]?.target.getAttribute(
          "data-frame-id",
        );

        if (nextFrameId) {
          setActiveFrameId(nextFrameId);
        }
      },
      {
        root: viewport,
        threshold: [0.35, 0.6, 0.85],
        rootMargin: "-12% 0px -18% 0px",
      },
    );

    for (const frame of frames) {
      const node = frameRefs.current[frame.id];
      if (node) {
        observer.observe(node);
      }
    }

    return () => observer.disconnect();
  }, [frames]);

  const jumpToFrame = (frameId: string) => {
    setActiveFrameId(frameId);
    frameRefs.current[frameId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (!frames.length) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Shared canvas
          </p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight">
            This canvas has no frames yet
          </h1>
          <p className="mt-3 text-pretty text-sm leading-6 text-muted-foreground">
            Ask the teacher to add at least one frame before sharing this
            lesson.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Shared canvas"
      className="flex h-screen min-h-0 flex-col overflow-hidden bg-background text-foreground"
      style={{
        ...getCanvasAppThemeVars(false),
        ...getCanvasThemeStyle(theme, typographyScale),
      }}
    >
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border/80 bg-background/92 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-border bg-muted/25 text-primary shadow-xs">
            <Logo isLink={false} width={20} height={20} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold sm:text-base">
                {canvas.title}
              </p>
              <Badge
                variant="outline"
                className="rounded-full border-border/80 bg-muted/20 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
              >
                Shared canvas
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {formatTopic(canvas.topic)} {" - "} {frames.length} frame
              {frames.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </header>

      <main
        aria-label="Shared canvas stage"
        className="min-h-0 flex-1 overflow-hidden bg-[var(--canvas-stage)]"
      >
        <div ref={stageScrollRootRef} className="h-full min-h-0">
          <ScrollArea className="h-full min-h-0" scrollFade scrollbarGutter>
            <div className="mx-auto grid min-h-full max-w-6xl gap-6 px-3 py-5 sm:px-4 lg:px-6 lg:py-6">
              {frames.map((frame) => {
                const isActive = frame.id === activeFrameId;

                return (
                  <div
                    key={frame.id}
                    ref={(node) => {
                      frameRefs.current[frame.id] = node;
                    }}
                    data-frame-id={frame.id}
                    className={cn(
                      "scroll-mt-5 rounded-[28px] p-1 transition-[transform,box-shadow,border-color] duration-200",
                      isActive
                        ? "bg-primary/12 shadow-[0_18px_60px_color-mix(in_srgb,var(--canvas-shadow-color),transparent_25%)]"
                        : "",
                    )}
                  >
                    <div
                      className={cn(
                        "canvas-shared-frame overflow-hidden rounded-[24px] border border-border/80 bg-background/72 shadow-[0_22px_70px_var(--canvas-shadow-color)] transition-[border-color,box-shadow]",
                        isActive && "border-primary/45",
                      )}
                    >
                      <Render config={canvasPuckConfig} data={frame.document} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </main>

      <div className="hidden shrink-0 items-center justify-between border-t border-border/80 bg-background/92 px-4 py-2 text-xs text-muted-foreground backdrop-blur-xl sm:flex">
        <p className="truncate">
          Viewing frame{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {activeFrameIndex + 1}
          </span>{" "}
          of{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {frames.length}
          </span>
        </p>
        <button
          type="button"
          onClick={() => {
            const nextFrame =
              frames[Math.min(activeFrameIndex + 1, frames.length - 1)];

            if (nextFrame) {
              jumpToFrame(nextFrame.id);
            }
          }}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium text-foreground transition hover:bg-accent/35"
        >
          Next frame
          <ChevronRightIcon className="size-3.5" />
        </button>
      </div>
    </section>
  );
}
