import type { CanvasDocument } from "@/features/canvas/types/canvas-types";

export type CanvasPresentationFrame = {
  document: CanvasDocument;
  id: string;
  index: number;
  searchText: string;
  title: string;
};

export function getCanvasPresentationFrames(
  document: CanvasDocument,
): CanvasPresentationFrame[] {
  return document.content
    .filter((item) => item.type === "SlideBlock")
    .map((item, index) => {
      const title = item.props.title || `Frame ${index + 1}`;

      return {
        document: {
          ...document,
          content: [
            {
              ...item,
              props: {
                ...item.props,
                frameLabel: `Frame ${index + 1}`,
              },
            },
          ],
        },
        id: item.props.id,
        index,
        searchText: collectSearchText(item.props).toLowerCase(),
        title,
      };
    });
}

export function describePresentationFrames(document: CanvasDocument) {
  return getCanvasPresentationFrames(document).map((frame) => ({
    frame_number: frame.index + 1,
    title: frame.title,
    searchable_content: frame.searchText.slice(0, 1200),
  }));
}

/**
 * The visual block types present on a frame (e.g. ["Heading", "Array", "Code"]).
 * This is what lets the model reason about *what kind* of content is on screen,
 * not just its text — so it knows an array is there to highlight, a diagram to
 * point at, etc.
 */
export function getFrameBlockTypes(frame: CanvasPresentationFrame): string[] {
  const slide = frame.document.content[0] as
    | { props?: { content?: Array<{ type?: string }> } }
    | undefined;
  const children = slide?.props?.content ?? [];
  return children
    .map((child) => String(child.type ?? "").replace(/Block$/, ""))
    .filter(Boolean);
}

/**
 * Compact ground-truth description of a single frame, sent to the model every
 * time the visible frame changes (manual or AI nav). This is the "sight" — it
 * keeps the model's idea of "where are we and what's here" from going stale.
 */
export function describeFrameForModel(
  frame: CanvasPresentationFrame,
  totalFrames: number,
): string {
  return JSON.stringify({
    now_showing: {
      frame_number: frame.index + 1,
      total_frames: totalFrames,
      title: frame.title,
      block_types: getFrameBlockTypes(frame),
      content: frame.searchText.slice(0, 800),
    },
  });
}

function collectSearchText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(collectSearchText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => key !== "id")
      .map(([, child]) => collectSearchText(child))
      .join(" ");
  }

  return "";
}
