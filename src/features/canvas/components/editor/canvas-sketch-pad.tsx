"use client";

import "@excalidraw/excalidraw/index.css";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Drawer, useGetPuck } from "@puckeditor/core";
import { GripVerticalIcon, PlusIcon } from "lucide-react";

import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_SKETCH_WIDTH_PERCENT,
  sketchWidthOptions,
} from "@/features/canvas/lib/sketch-sizes";
import { setPendingSketch } from "@/features/canvas/lib/sketch-transfer";
import type { FrameSummary } from "@/features/canvas/types/canvas-other-types";
import type {
  SketchPayload,
  SketchSceneData,
} from "@/features/canvas/types/canvas-types";
import { cn } from "@/lib/utils";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
        Loading drawing tools
      </div>
    ),
  },
);

type ExcalidrawApi = {
  getSceneElements: () => readonly { id: string; isDeleted?: boolean }[];
  getAppState: () => Record<string, unknown> & {
    selectedElementIds?: Record<string, boolean>;
  };
  getFiles: () => Record<string, unknown>;
};

type CanvasSketchPadProps = {
  /** Scene to open with. Called once, at mount. */
  getInitialScene: () => SketchSceneData | null;
  /**
   * Fires on *every* edit. The receiver must park the value in a ref — calling
   * setState here re-renders the pad, which makes Excalidraw emit another
   * change and loops until React bails out.
   */
  onSceneChange: (scene: SketchSceneData) => void;
  activeFrameId: string | null;
  frames: FrameSummary[];
  /** Hidden in the modal, where there is no canvas to drop onto. */
  showDragHandle?: boolean;
  onAdded?: () => void;
};

/** Chunked so very large drawings don't blow the argument limit of fromCharCode. */
function toBase64(input: string) {
  const bytes = new TextEncoder().encode(input);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return window.btoa(binary);
}

/**
 * Exports the current selection (or the whole scratchpad when nothing is
 * selected) to an inline SVG data URI, sized so the block can reserve the right
 * aspect ratio before the image paints.
 */
async function exportSketch(
  api: ExcalidrawApi,
  widthPercent: number,
): Promise<SketchPayload | null> {
  const { exportToSvg } = await import("@excalidraw/excalidraw");

  const appState = api.getAppState();
  const selectedIds = appState.selectedElementIds ?? {};
  const allElements = api
    .getSceneElements()
    .filter((element) => !element.isDeleted);
  const selected = allElements.filter((element) => selectedIds[element.id]);
  const elements = selected.length ? selected : allElements;

  if (!elements.length) {
    return null;
  }

  const svg = await exportToSvg({
    elements: elements as never,
    appState: { ...appState, exportBackground: false } as never,
    files: api.getFiles() as never,
    exportPadding: 8,
  });

  const width = Number.parseFloat(svg.getAttribute("width") ?? "") || 1;
  const height = Number.parseFloat(svg.getAttribute("height") ?? "") || 1;
  const markup = new XMLSerializer().serializeToString(svg);

  return {
    src: `data:image/svg+xml;base64,${toBase64(markup)}`,
    aspectRatio: width / height,
    widthPercent,
  };
}

type PuckComponentData = {
  type: string;
  props: Record<string, unknown> & { id: string };
};

export function CanvasSketchPad({
  getInitialScene,
  onSceneChange,
  activeFrameId,
  frames,
  showDragHandle = true,
  onAdded,
}: CanvasSketchPadProps) {
  const getPuck = useGetPuck();
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const [initialScene] = useState(getInitialScene);
  const [hasContent, setHasContent] = useState(
    () => (initialScene?.elements?.length ?? 0) > 0,
  );
  const [initialData] = useState(() =>
    initialScene
      ? {
          elements: (initialScene.elements ?? []) as never,
          appState: (initialScene.appState ?? {}) as never,
          files: (initialScene.files ?? {}) as never,
        }
      : undefined,
  );

  // items-first: Base UI reads labels for the trigger from `items`, otherwise
  // the trigger falls back to printing the raw value (the frame id).
  const frameItems = useMemo(
    () =>
      frames.map((frame, index) => ({
        label: `Frame ${index + 1}${frame.title ? ` — ${frame.title}` : ""}`,
        value: frame.id,
      })),
    [frames],
  );

  const [widthPercent, setWidthPercent] = useState(
    DEFAULT_SKETCH_WIDTH_PERCENT,
  );

  const fallbackFrameId =
    activeFrameId ?? (frames.length ? frames[frames.length - 1].id : "");
  const [targetFrameId, setTargetFrameId] = useState(fallbackFrameId);
  const selectedFrameId = frames.some((frame) => frame.id === targetFrameId)
    ? targetFrameId
    : fallbackFrameId;

  // Held in a ref so the parent can read the newest scene without this
  // component re-rendering — see the note on `onSceneChange`.
  const commitScene = useRef(onSceneChange);

  useEffect(() => {
    commitScene.current = onSceneChange;
  });

  const handleExcalidrawApi = useCallback((api: unknown) => {
    apiRef.current = api as ExcalidrawApi;
  }, []);

  const handleChange = useCallback(
    (
      elements: readonly { isDeleted?: boolean }[],
      appState: { viewBackgroundColor?: string } | undefined,
      files: unknown,
    ) => {
      commitScene.current({
        elements: elements as readonly unknown[],
        appState: {
          viewBackgroundColor: appState?.viewBackgroundColor ?? "#ffffff",
        },
        files: files as Record<string, unknown>,
      });

      // Same-value sets bail out in React, so this settles after the first mark.
      setHasContent((elements ?? []).some((element) => !element.isDeleted));
    },
    [],
  );

  // Start exporting the moment the drag begins so the image is ready (or at
  // least in flight) by the time the block lands on the canvas.
  const handleDragStart = useCallback(() => {
    const api = apiRef.current;
    setPendingSketch(api ? exportSketch(api, widthPercent) : null);
  }, [widthPercent]);

  // Drop-free path: insert straight into the frame the teacher is working in.
  const handleAddToFrame = useCallback(async () => {
    const api = apiRef.current;

    if (!api) {
      return;
    }

    const sketch = await exportSketch(api, widthPercent);

    if (!sketch) {
      return;
    }

    // Kept in sync so `SketchBlock.resolveData` stamps the same image if Puck
    // resolves the new block before the explicit prop write below lands.
    setPendingSketch(Promise.resolve(sketch));

    const puck = getPuck();
    const frame = puck.getItemById(selectedFrameId) as PuckComponentData | undefined;

    if (!frame) {
      return;
    }

    const zone = `${selectedFrameId}:content`;
    const index = Array.isArray(frame.props.content)
      ? frame.props.content.length
      : 0;
    const id = `SketchBlock-${crypto.randomUUID()}`;

    puck.dispatch({
      type: "insert",
      componentType: "SketchBlock",
      destinationIndex: index,
      destinationZone: zone,
      id,
    });

    const next = getPuck();
    const selector = next.getSelectorForId(id);
    const item = next.getItemById(id);

    if (!selector || !item) {
      return;
    }

    next.dispatch({
      type: "replace",
      destinationZone: selector.zone,
      destinationIndex: selector.index,
      data: {
        ...item,
        props: {
          ...item.props,
          src: sketch.src,
          aspectRatio: sketch.aspectRatio,
          widthPercent: sketch.widthPercent,
        },
      },
    });

    next.dispatch({ type: "setUi", ui: { itemSelector: selector } });
    onAdded?.();
  }, [getPuck, onAdded, selectedFrameId, widthPercent]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-background">
        <Excalidraw
          excalidrawAPI={handleExcalidrawApi}
          initialData={initialData}
          onChange={handleChange}
          UIOptions={{
            canvasActions: { toggleTheme: false, saveToActiveFile: false },
          }}
        />
      </div>

      {showDragHandle ? (
        <Drawer>
          <Drawer.Item
            name="SketchBlock"
            label="Drawing"
            isDragDisabled={!hasContent}
          >
            {() => (
              <div
                onPointerDown={handleDragStart}
                aria-disabled={!hasContent}
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2.5 text-xs font-medium transition",
                  hasContent
                    ? "cursor-grab text-foreground hover:border-primary hover:bg-primary/8 active:cursor-grabbing"
                    : "cursor-not-allowed text-muted-foreground opacity-60",
                )}
              >
                <GripVerticalIcon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  {hasContent
                    ? "Drag onto the canvas"
                    : "Draw something to drag it out"}
                </span>
              </div>
            )}
          </Drawer.Item>
        </Drawer>
      ) : null}

      <div className="flex items-center gap-2">
        <Select
          items={frameItems}
          value={selectedFrameId}
          disabled={!frames.length}
          onValueChange={(next) => setTargetFrameId(String(next))}
        >
          <SelectTrigger className="min-w-0 flex-1" size="sm">
            <SelectValue placeholder="Choose a frame" />
          </SelectTrigger>
          <SelectPopup>
            {frameItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>

        <Select
          items={sketchWidthOptions}
          value={widthPercent}
          onValueChange={(next) => setWidthPercent(Number(next))}
        >
          <SelectTrigger className="w-24 shrink-0" size="sm">
            <SelectValue placeholder="Width" />
          </SelectTrigger>
          <SelectPopup>
            {sketchWidthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>

        <button
          type="button"
          disabled={!hasContent || !frames.length}
          onClick={() => void handleAddToFrame()}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
        >
          <PlusIcon className="size-3.5" />
          Add
        </button>
      </div>

      <p className="px-1 text-[11px] leading-4 text-muted-foreground">
        Select shapes to take just those, or leave nothing selected to take the
        whole sketch.
      </p>
    </div>
  );
}
