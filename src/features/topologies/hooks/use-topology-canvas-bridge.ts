"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type { TopoScene } from "@/features/topologies/lib/topology-kit";
import type { BlockControls } from "@/features/topologies/tools/tool-context";
import { applyCanvasAction, FRAME_CONTENT_LIMIT_MESSAGE } from "@/features/canvas/lib/canvas-commands";
import type { CanvasAiAction, CanvasDocument } from "@/features/canvas/types/canvas-types";

type BlockLike = { type: string; props: { id: string; scene?: TopoScene } };
type SlideLike = { type: string; props: { id: string; title?: string; content?: BlockLike[] } };

function slidesOf(document: CanvasDocument): SlideLike[] {
  return (document.content as unknown as SlideLike[]).filter((item) => item.type === "SlideBlock");
}

function topologyBlocksOf(document: CanvasDocument, frameId: string | null): BlockLike[] {
  const slide = slidesOf(document).find((item) => item.props.id === frameId);
  return (slide?.props.content ?? []).filter((item) => item.type === "TopologyBlock");
}

/**
 * Read the topology already authored on a frame — mirrors
 * `readCountingStripFromFrame`. Without this, Mesh starts every session
 * believing the board is empty, so "add a router" would build a fresh scene
 * instead of extending the one the class is looking at.
 */
export function readTopologyFromFrame(document: CanvasDocument, frameId: string | null): TopoScene | null {
  const blocks = topologyBlocksOf(document, frameId);
  const block = blocks[blocks.length - 1];
  return block?.props.scene ?? null;
}

function findTopologyBlockOnFrame(document: CanvasDocument, frameId: string | null): string | null {
  const blocks = topologyBlocksOf(document, frameId);
  return blocks[blocks.length - 1]?.props.id ?? null;
}

type BridgeArgs = {
  getDocument: () => CanvasDocument;
  getActiveFrameId: () => string | null;
  applyDocument: (document: CanvasDocument, activeFrameId: string | null) => void;
};

/**
 * Connects Mesh to the canvas document. One topology board per frame, no
 * animation-beat writes — the agent (and the board's own drag/connect
 * handlers) own the scene during a session; this bridge guarantees a block
 * exists to hold it and writes the settled scene back into the document.
 */
export function useTopologyCanvasBridge({ getDocument, getActiveFrameId, applyDocument }: BridgeArgs) {
  const targetBlockIdRef = useRef<string | null>(null);
  const [targetBlockId, setTargetBlockId] = useState<string | null>(null);

  const setTarget = useCallback((blockId: string | null) => {
    targetBlockIdRef.current = blockId;
    setTargetBlockId(blockId);
  }, []);

  /** Guarantee a topology block exists to drive, creating a frame first if the visible one is full. */
  const ensureTopologyBlock = useCallback(
    (scene: TopoScene) => {
      const document = getDocument();
      const frameId = getActiveFrameId();
      const existing = findTopologyBlockOnFrame(document, frameId);

      if (existing) {
        setTarget(existing);
        const result = applyCanvasAction(document, frameId, {
          action: "set_topology_scene",
          componentId: existing,
          scene,
        });
        applyDocument(result.document, result.activeSlideId);
        return existing;
      }

      let result = applyCanvasAction(document, frameId, { action: "add_topology_block", scene });
      if (result.message === FRAME_CONTENT_LIMIT_MESSAGE) {
        const withFrame = applyCanvasAction(document, frameId, { action: "add_frame", title: "Network topology" });
        result = applyCanvasAction(withFrame.document, withFrame.activeSlideId, {
          action: "add_topology_block",
          scene,
        });
      }

      applyDocument(result.document, result.activeSlideId);
      const created = findTopologyBlockOnFrame(result.document, result.activeSlideId);
      setTarget(created);
      return created;
    },
    [applyDocument, getActiveFrameId, getDocument, setTarget],
  );

  /** Write a settled scene into the document — called after every committed operation. */
  const commitTopologyScene = useCallback(
    (scene: TopoScene) => {
      ensureTopologyBlock(scene);
    },
    [ensureTopologyBlock],
  );

  const releaseTarget = useCallback(() => setTarget(null), [setTarget]);

  const applyWithOverflow = useCallback(
    (action: CanvasAiAction, newFrameTitle: string) => {
      const document = getDocument();
      const frameId = getActiveFrameId();
      let result = applyCanvasAction(document, frameId, action);
      let overflowed = false;

      if (result.message === FRAME_CONTENT_LIMIT_MESSAGE) {
        const withFrame = applyCanvasAction(document, frameId, { action: "add_frame", title: newFrameTitle });
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
          const result = applyCanvasAction(document, frameId, { action: "update_frame_title", title: text });
          applyDocument(result.document, result.activeSlideId);
          return `Renamed this frame to "${text}".`;
        }

        const blockType =
          target === "heading" ? "HeadingTextBlock" : target === "subheading" ? "SubheadingTextBlock" : "BodyTextBlock";
        const { result } = applyWithOverflow({ action: "set_block_text", blockType, text }, text.slice(0, 40));
        return result.message;
      },

      remove(target) {
        const blockType = {
          heading: "HeadingTextBlock",
          subheading: "SubheadingTextBlock",
          body: "BodyTextBlock",
          board: "TopologyBlock",
        }[target];

        const document = getDocument();
        const frameId = getActiveFrameId();
        const result = applyCanvasAction(document, frameId, { action: "remove_block", blockType });
        applyDocument(result.document, result.activeSlideId);

        if (blockType === "TopologyBlock") setTarget(null);
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
          : applyCanvasAction(document, frameId, { action: "add_frame_below", frameId: frameId ?? undefined, title });

        applyDocument(result.document, result.activeSlideId);
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

  /** Adopt whatever topology is on the given frame as the agent's working scene. */
  const adoptFrameTopology = useCallback(
    (frameId: string | null) => {
      const found = readTopologyFromFrame(getDocument(), frameId);
      setTarget(found ? findTopologyBlockOnFrame(getDocument(), frameId) : null);
      return found;
    },
    [getDocument, setTarget],
  );

  return {
    /** Block Mesh is driving — pass to TopologyAgentViewProvider. */
    targetBlockId,
    adoptFrameTopology,
    blockControls,
    commitTopologyScene,
    ensureTopologyBlock,
    releaseTarget,
  };
}
