"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type {
  CountingFrame,
  Division,
  HighlightRule,
  Mode,
  Order,
} from "@/features/counting-agent/lib/counting-types";
import type { BlockControls } from "@/features/counting-agent/tools/tool-context";
import {
  applyCanvasAction,
  FRAME_CONTENT_LIMIT_MESSAGE,
} from "@/features/canvas/lib/canvas-commands";
import type { CanvasAiAction, CanvasDocument } from "@/features/canvas/types/canvas-types";

type BlockLike = {
  type: string;
  props: {
    id: string;
    total?: number;
    order?: Order;
    mode?: Mode;
    highlights?: Array<{ id: string; label: string; of: number }>;
    divisionBy?: number | null;
  };
};

type SlideLike = {
  type: string;
  props: { id: string; title?: string; content?: BlockLike[] };
};

/** The authored number strip on a frame, as the agent needs to see it. */
export type FrameCountingStripSnapshot = {
  blockId: string;
  total: number;
  order: Order;
  mode: Mode;
  highlights: HighlightRule[];
  division: Division;
};

function slidesOf(document: CanvasDocument): SlideLike[] {
  return (document.content as unknown as SlideLike[]).filter(
    (item) => item.type === "SlideBlock",
  );
}

/** Every number-strip block on a frame, in layout order — there is meant to be at most one. */
function countingStripBlocksOf(document: CanvasDocument, frameId: string | null): BlockLike[] {
  const slide = slidesOf(document).find((item) => item.props.id === frameId);
  return (slide?.props.content ?? []).filter((item) => item.type === "CountingStripBlock");
}

/**
 * Read the strip already authored on a frame — mirrors `readArrayFromFrame`.
 * Without this, the agent starts every session believing the board is empty,
 * so "divide by 5" would divide a strip that was never adopted.
 */
export function readCountingStripFromFrame(
  document: CanvasDocument,
  frameId: string | null,
): FrameCountingStripSnapshot | null {
  const blocks = countingStripBlocksOf(document, frameId);
  const block = blocks[blocks.length - 1];
  if (!block) return null;

  return {
    blockId: block.props.id,
    total: block.props.total ?? 100,
    order: block.props.order ?? "ascending",
    mode: block.props.mode ?? "list",
    highlights: (block.props.highlights ?? []).map((rule) => ({ ...rule })),
    division:
      typeof block.props.divisionBy === "number" ? { divisor: block.props.divisionBy } : null,
  };
}

function findCountingStripBlockOnFrame(
  document: CanvasDocument,
  frameId: string | null,
): string | null {
  return readCountingStripFromFrame(document, frameId)?.blockId ?? null;
}

type BridgeArgs = {
  getDocument: () => CanvasDocument;
  getActiveFrameId: () => string | null;
  applyDocument: (document: CanvasDocument, activeFrameId: string | null) => void;
};

/**
 * Connects the counting agent to the canvas document.
 *
 * Much simpler than the arrays bridge: one strip per frame, no "combine"
 * concept, and no code-block sync. The agent owns the strip's values during a
 * session and animates them through the view context; this bridge guarantees
 * there is a block to hold them and writes settled values back into the
 * document.
 */
export function useCountingCanvasBridge({ getDocument, getActiveFrameId, applyDocument }: BridgeArgs) {
  const targetBlockIdRef = useRef<string | null>(null);
  const [targetBlockId, setTargetBlockId] = useState<string | null>(null);

  const setTarget = useCallback((blockId: string | null) => {
    targetBlockIdRef.current = blockId;
    setTargetBlockId(blockId);
  }, []);

  /**
   * Guarantee a number-strip block exists to drive, creating a frame first if
   * the visible one is full. Mirrors `ensureArrayBlock`.
   */
  const ensureCountingStripBlock = useCallback(
    (strip: { total: number; order: Order; mode: Mode; highlights: HighlightRule[]; division: Division }) => {
      const document = getDocument();
      const frameId = getActiveFrameId();
      const existing = findCountingStripBlockOnFrame(document, frameId);

      const setAction: CanvasAiAction = {
        action: "set_counting_strip",
        componentId: existing ?? undefined,
        total: strip.total,
        order: strip.order,
        mode: strip.mode,
        highlights: strip.highlights,
        divisionBy: strip.division?.divisor ?? null,
      };

      if (existing) {
        setTarget(existing);
        const result = applyCanvasAction(document, frameId, setAction);
        applyDocument(result.document, result.activeSlideId);
        return existing;
      }

      let result = applyCanvasAction(document, frameId, {
        action: "add_counting_strip_block",
        total: strip.total,
        order: strip.order,
        mode: strip.mode,
        highlights: strip.highlights,
        divisionBy: strip.division?.divisor ?? null,
      });

      if (result.message === FRAME_CONTENT_LIMIT_MESSAGE) {
        const withFrame = applyCanvasAction(document, frameId, {
          action: "add_frame",
          title: "Counting",
        });
        result = applyCanvasAction(withFrame.document, withFrame.activeSlideId, {
          action: "add_counting_strip_block",
          total: strip.total,
          order: strip.order,
          mode: strip.mode,
          highlights: strip.highlights,
          divisionBy: strip.division?.divisor ?? null,
        });
      }

      applyDocument(result.document, result.activeSlideId);
      const created = findCountingStripBlockOnFrame(result.document, result.activeSlideId);
      setTarget(created);
      return created;
    },
    [applyDocument, getActiveFrameId, getDocument, setTarget],
  );

  /**
   * Write a settled frame into the document — called once an animation ends.
   * Unlike the arrays bridge (whose `ensureArrayBlock` fires immediately, on
   * creation, separately from the later `commitValues`), the counting tool
   * context has no separate "ensure" hook — `play()` is the one path for
   * every operation, so `ensureCountingStripBlock` above (create-or-update)
   * doubles as the commit path too.
   */
  const commitCountingStrip = useCallback(
    (final: CountingFrame) => {
      ensureCountingStripBlock({
        total: final.total,
        order: final.order,
        mode: final.mode,
        highlights: final.highlights,
        division: final.division,
      });
    },
    [ensureCountingStripBlock],
  );

  const releaseTarget = useCallback(() => {
    setTarget(null);
  }, [setTarget]);

  /** Apply a canvas action, adding a frame first if this one is full. */
  const applyWithOverflow = useCallback(
    (action: CanvasAiAction, newFrameTitle: string) => {
      const document = getDocument();
      const frameId = getActiveFrameId();
      let result = applyCanvasAction(document, frameId, action);
      let overflowed = false;

      if (result.message === FRAME_CONTENT_LIMIT_MESSAGE) {
        const withFrame = applyCanvasAction(document, frameId, {
          action: "add_frame",
          title: newFrameTitle,
        });
        result = applyCanvasAction(withFrame.document, withFrame.activeSlideId, action);
        overflowed = true;
      }

      applyDocument(result.document, result.activeSlideId);
      return { result, overflowed };
    },
    [applyDocument, getActiveFrameId, getDocument],
  );

  const blockControls = useMemo<BlockControls>(
    () => ({
      add({ type, text }) {
        const action: CanvasAiAction =
          type === "heading"
            ? { action: "add_text_block", heading: text }
            : type === "subheading"
              ? { action: "add_subheading_block", text }
              : { action: "add_body_block", text };

        const { result, overflowed } = applyWithOverflow(action, text?.slice(0, 40) ?? "Frame");
        return overflowed
          ? `${result.message} The frame was full, so this went on a new frame, which is now showing.`
          : result.message;
      },

      update(target, text) {
        const document = getDocument();
        const frameId = getActiveFrameId();

        if (target === "frame_title") {
          const result = applyCanvasAction(document, frameId, {
            action: "update_frame_title",
            title: text,
          });
          applyDocument(result.document, result.activeSlideId);
          return `Renamed this frame to "${text}".`;
        }

        const blockType =
          target === "heading"
            ? "HeadingTextBlock"
            : target === "subheading"
              ? "SubheadingTextBlock"
              : "BodyTextBlock";

        const { result } = applyWithOverflow(
          { action: "set_block_text", blockType, text },
          text.slice(0, 40),
        );
        return result.message;
      },

      remove(target) {
        const blockType = {
          heading: "HeadingTextBlock",
          subheading: "SubheadingTextBlock",
          body: "BodyTextBlock",
          strip: "CountingStripBlock",
        }[target];

        const document = getDocument();
        const frameId = getActiveFrameId();
        const result = applyCanvasAction(document, frameId, {
          action: "remove_block",
          blockType,
        });
        applyDocument(result.document, result.activeSlideId);

        if (blockType === "CountingStripBlock") setTarget(null);
        return result.message;
      },

      clearFrame() {
        const document = getDocument();
        const frameId = getActiveFrameId();
        const result = applyCanvasAction(document, frameId, { action: "clear_frame" });
        applyDocument(result.document, result.activeSlideId);
        setTarget(null);
        return result.message;
      },

      addFrame({ title, copyCurrent }) {
        const document = getDocument();
        const frameId = getActiveFrameId();
        const result = copyCurrent
          ? applyCanvasAction(document, frameId, { action: "duplicate_frame", frameId: frameId ?? undefined })
          : applyCanvasAction(document, frameId, {
              action: "add_frame_below",
              frameId: frameId ?? undefined,
              title,
            });

        applyDocument(result.document, result.activeSlideId);
        // The new frame becomes the working one; its strip (a copy's, or none)
        // is adopted by the frame-change effect.
        setTarget(null);

        const frames = slidesOf(result.document);
        const position = frames.findIndex((item) => item.props.id === result.activeSlideId) + 1;
        return copyCurrent
          ? `Duplicated the frame. You are now on frame ${position} of ${frames.length}.`
          : `Added frame ${position} of ${frames.length}${title ? ` — "${title}"` : ""}, and moved to it.`;
      },
    }),
    [applyDocument, applyWithOverflow, getActiveFrameId, getDocument, setTarget],
  );

  /**
   * Adopt whatever strip is on the given frame as the agent's working strip.
   * Returns null when the frame has none, so the caller can decide whether to
   * clear the agent's state or leave it alone.
   */
  const adoptFrameCountingStrip = useCallback(
    (frameId: string | null) => {
      const found = readCountingStripFromFrame(getDocument(), frameId);
      setTarget(found?.blockId ?? null);
      return found;
    },
    [getDocument, setTarget],
  );

  return {
    /** Block the agent is driving — pass to CountingAgentViewProvider. */
    targetBlockId,
    adoptFrameCountingStrip,
    blockControls,
    commitCountingStrip,
    ensureCountingStripBlock,
    releaseTarget,
  };
}
