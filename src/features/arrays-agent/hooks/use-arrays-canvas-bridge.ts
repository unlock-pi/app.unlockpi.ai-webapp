"use client";

import { useCallback, useRef, useState } from "react";

import type { ArrayValue } from "@/features/arrays-agent/lib/array-types";
import {
  applyCanvasAction,
  FRAME_CONTENT_LIMIT_MESSAGE,
} from "@/features/canvas/lib/canvas-commands";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";

type SlideLike = {
  type: string;
  props: { id: string; content?: Array<{ type: string; props: { id: string } }> };
};

function slidesOf(document: CanvasDocument): SlideLike[] {
  return (document.content as unknown as SlideLike[]).filter(
    (item) => item.type === "SlideBlock",
  );
}

/**
 * Which array block a spoken command means.
 *
 * Mirrors the precedence the canvas already uses for its own AI actions: the
 * most recently added array on the visible frame, then the first one there.
 * Reaching outside the visible frame is deliberately NOT done — the class can
 * only see one frame, so "the array" can only mean one on it.
 */
function findArrayBlockOnFrame(
  document: CanvasDocument,
  frameId: string | null,
): string | null {
  const slide = slidesOf(document).find((item) => item.props.id === frameId);
  const arrays = (slide?.props.content ?? []).filter((item) => item.type === "ArrayBlock");
  return arrays.length ? arrays[arrays.length - 1].props.id : null;
}

type BridgeArgs = {
  getDocument: () => CanvasDocument;
  getActiveFrameId: () => string | null;
  applyDocument: (document: CanvasDocument, activeFrameId: string | null) => void;
};

/**
 * Connects the arrays agent to the canvas document.
 *
 * The agent owns the array's VALUES during a session and animates them through
 * the view context; this bridge is what makes those values persist into the
 * document, and what guarantees there is a block to persist them into.
 */
export function useArraysCanvasBridge({
  getDocument,
  getActiveFrameId,
  applyDocument,
}: BridgeArgs) {
  /**
   * The block the agent is driving, so every commit lands on the same one.
   * Kept in a ref AND in state: callbacks fire in bursts and need the value
   * synchronously, while the view provider needs a re-render when it changes.
   */
  const targetBlockIdRef = useRef<string | null>(null);
  const [targetBlockId, setTargetBlockId] = useState<string | null>(null);

  const setTarget = useCallback((blockId: string | null) => {
    targetBlockIdRef.current = blockId;
    setTargetBlockId(blockId);
  }, []);

  /**
   * Guarantee an array block exists to drive, creating a frame first if the
   * visible one is full.
   *
   * The canvas frame is a fixed 16:9 stage with a real content budget, so
   * "add an array" can legitimately not fit. Rather than failing the teacher's
   * command, this moves to a fresh frame and puts it there — which is what a
   * teacher running out of board space would do anyway.
   */
  const ensureArrayBlock = useCallback(
    (values: ArrayValue[], title?: string) => {
      const document = getDocument();
      const frameId = getActiveFrameId();
      const existing = findArrayBlockOnFrame(document, frameId);

      if (existing) {
        setTarget(existing);
        const result = applyCanvasAction(document, frameId, {
          action: "set_array_values",
          componentId: existing,
          values,
        });
        applyDocument(result.document, result.activeSlideId);
        return existing;
      }

      let result = applyCanvasAction(document, frameId, {
        action: "add_array_block",
        title,
        values,
      });

      if (result.message === FRAME_CONTENT_LIMIT_MESSAGE) {
        const withFrame = applyCanvasAction(document, frameId, {
          action: "add_frame",
          title: title ?? "Array",
        });
        result = applyCanvasAction(withFrame.document, withFrame.activeSlideId, {
          action: "add_array_block",
          title,
          values,
        });
      }

      applyDocument(result.document, result.activeSlideId);
      const created = findArrayBlockOnFrame(result.document, result.activeSlideId);
      setTarget(created);
      return created;
    },
    [applyDocument, getActiveFrameId, getDocument, setTarget],
  );

  /** Write settled values into the document — called when an animation ends. */
  const commitValues = useCallback(
    (values: ArrayValue[]) => {
      const document = getDocument();
      const frameId = getActiveFrameId();
      const blockId = targetBlockIdRef.current ?? findArrayBlockOnFrame(document, frameId);

      if (!blockId) {
        // Nothing to write into yet — the next ensureArrayBlock will create it.
        return;
      }

      setTarget(blockId);
      const result = applyCanvasAction(document, frameId, {
        action: "set_array_values",
        componentId: blockId,
        values,
      });
      applyDocument(result.document, result.activeSlideId);
    },
    [applyDocument, getActiveFrameId, getDocument, setTarget],
  );

  const releaseTarget = useCallback(() => setTarget(null), [setTarget]);

  return {
    /** Block the agent is driving — pass to ArraysAgentViewProvider. */
    targetBlockId,
    commitValues,
    ensureArrayBlock,
    releaseTarget,
  };
}
