import type { SketchPayload } from "@/features/canvas/types/canvas-types";

/**
 * Hand-off slot between the Draw tool panel and a dropped SketchBlock.
 *
 * Puck's `Drawer.Item` can only carry a component *name*, so the drawing itself
 * cannot ride along with the drag. Instead the panel starts an export when the
 * drag begins and parks the promise here; `SketchBlock.resolveData` awaits it as
 * the block is inserted. A promise (rather than a resolved value) means a drop
 * that lands before the export finishes still gets its image.
 *
 * Deliberately module state, not Puck `metadata`: metadata changes re-resolve
 * every component in the document, which would fire on each drag.
 */
let pendingSketch: Promise<SketchPayload | null> | null = null;

export function setPendingSketch(next: Promise<SketchPayload | null> | null) {
  pendingSketch = next;
}

/**
 * Kept (not cleared) after reading so a re-resolve of the same block still finds
 * its image. Each drag overwrites it, so a block never picks up a stale drawing.
 */
export async function readPendingSketch(): Promise<SketchPayload | null> {
  if (!pendingSketch) {
    return null;
  }

  try {
    return await pendingSketch;
  } catch {
    return null;
  }
}
