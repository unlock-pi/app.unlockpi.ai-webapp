"use client";

import { useCallback, useRef, useState } from "react";

import type { PDABlockProps } from "@/components/pda";
import type { PDA } from "@/features/pda/model-agent";
import {
  applyCanvasAction,
  FRAME_CONTENT_LIMIT_MESSAGE,
} from "@/features/canvas/lib/canvas-commands";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";

type Slide = {
  type: string;
  props: {
    id: string;
    content?: Array<{ type: string; props: PDABlockProps & { id: string } }>;
  };
};

export type FramePDASnapshot = {
  frameId: string;
  blockId: string;
  pda: PDA;
  input: string;
  showTransitionTable: boolean;
};

type Args = {
  getDocument: () => CanvasDocument;
  getActiveFrameId: () => string | null;
  applyDocument: (document: CanvasDocument, activeFrameId: string | null) => void;
};

function slides(document: CanvasDocument) {
  return document.content.filter((item) => item.type === "SlideBlock") as unknown as Slide[];
}

export function readPDAsFromFrame(document: CanvasDocument, frameId: string | null): FramePDASnapshot[] {
  const frame = slides(document).find((item) => item.props.id === frameId);
  return (frame?.props.content ?? [])
    .filter((item) => item.type === "PDABlock")
    .map((item) => ({
      frameId: frameId ?? "",
      blockId: item.props.id,
      pda: item.props.pda,
      input: item.props.input,
      showTransitionTable: item.props.showTransitionTable ?? true,
    }));
}

export function usePDACanvasBridge({ getDocument, getActiveFrameId, applyDocument }: Args) {
  const targetRef = useRef<string | null>(null);
  const [targetBlockId, setTargetBlockId] = useState<string | null>(null);
  const setTarget = useCallback((id: string | null) => {
    targetRef.current = id;
    setTargetBlockId(id);
  }, []);

  const adoptFramePDAs = useCallback((frameId: string | null) => {
    const current = readPDAsFromFrame(getDocument(), frameId);
    setTarget(current.at(-1)?.blockId ?? null);
    return current;
  }, [getDocument, setTarget]);

  const ensurePDABlock = useCallback((pda: PDA, input = "") => {
    const document = getDocument();
    const frameId = getActiveFrameId();
    const existing = readPDAsFromFrame(document, frameId)
      .find((item) => item.pda.id === pda.id);
    const props: PDABlockProps = {
      pda,
      input,
      showTransitionTable: existing?.showTransitionTable ?? true,
    };
    if (existing) {
      const result = applyCanvasAction(document, frameId, {
        action: "set_pda_block", componentId: existing.blockId, pda: props,
      });
      setTarget(existing.blockId);
      applyDocument(result.document, result.activeSlideId);
      return existing.blockId;
    }
    let result = applyCanvasAction(document, frameId, { action: "add_pda_block", pda: props });
    if (result.message === FRAME_CONTENT_LIMIT_MESSAGE) {
      const withFrame = applyCanvasAction(document, frameId, {
        action: "add_frame", title: `PDA — ${pda.id}`,
      });
      result = applyCanvasAction(withFrame.document, withFrame.activeSlideId, {
        action: "add_pda_block", pda: props,
      });
    }
    const created = readPDAsFromFrame(result.document, result.activeSlideId)
      .find((item) => item.pda.id === pda.id);
    setTarget(created?.blockId ?? null);
    applyDocument(result.document, result.activeSlideId);
    return created?.blockId ?? null;
  }, [applyDocument, getActiveFrameId, getDocument, setTarget]);

  return { targetBlockId, adoptFramePDAs, ensurePDABlock };
}
