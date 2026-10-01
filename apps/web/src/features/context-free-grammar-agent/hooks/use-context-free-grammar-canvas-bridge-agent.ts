"use client";

import { useCallback, useRef, useState } from "react";
import type { ContextFreeGrammarBlockProps } from "@/components/context-free-grammar";
import { reconcileContextFreeGrammarProps } from "@/components/context-free-grammar/authoring";
import { applyCanvasAction, FRAME_CONTENT_LIMIT_MESSAGE } from "@/features/canvas/lib/canvas-commands";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";
import type { GrammarError } from "@/features/context-free-grammar/grammar-engine";

type BlockLike = { type: string; props: Record<string, unknown> & { id: string } };
type SlideLike = { type: string; props: { id: string; content?: BlockLike[] } };
export type FrameGrammarSnapshot = {
  frameId: string;
  blockId: string;
  grammarId: string;
  props: ContextFreeGrammarBlockProps;
};
type BridgeArgs = {
  getDocument: () => CanvasDocument;
  getActiveFrameId: () => string | null;
  applyDocument: (document: CanvasDocument, activeFrameId: string | null) => void;
};
const slidesOf = (document: CanvasDocument) => (document.content as unknown as SlideLike[]).filter((item) => item.type === "SlideBlock");

export function readGrammarsFromFrame(document: CanvasDocument, frameId: string | null): FrameGrammarSnapshot[] {
  const slide = slidesOf(document).find((item) => item.props.id === frameId);
  return (slide?.props.content ?? []).filter((item) => item.type === "ContextFreeGrammarBlock").map((block) => {
    const props = reconcileContextFreeGrammarProps(block.props as unknown as ContextFreeGrammarBlockProps);
    return { frameId: frameId ?? "", blockId: block.props.id, grammarId: props.grammarId || block.props.id, props };
  });
}
export function readGrammarsFromCanvas(document: CanvasDocument): FrameGrammarSnapshot[] {
  return slidesOf(document).flatMap((slide) => readGrammarsFromFrame(document, slide.props.id));
}

export function useContextFreeGrammarCanvasBridge({ getDocument, getActiveFrameId, applyDocument }: BridgeArgs) {
  const targetBlockIdRef = useRef<string | null>(null);
  const [targetBlockId, setTargetBlockId] = useState<string | null>(null);
  const setTarget = useCallback((id: string | null) => {
    targetBlockIdRef.current = id;
    setTargetBlockId(id);
  }, []);

  const adoptFrameGrammars = useCallback((frameId: string | null) => {
    const document = getDocument();
    const all = readGrammarsFromCanvas(document);
    const onFrame = all.filter((item) => item.frameId === frameId);
    setTarget(onFrame.at(-1)?.blockId ?? null);
    return { all, selectedGrammarId: onFrame.at(-1)?.grammarId ?? null };
  }, [getDocument, setTarget]);

  const selectGrammarBlock = useCallback((grammarId: string): GrammarError | null => {
    const document = getDocument();
    const found = readGrammarsFromCanvas(document).find((item) => item.grammarId === grammarId);
    if (!found) return { code: "GRAMMAR_NOT_FOUND", message: "CFG " + grammarId + " has no Puck block." };
    setTarget(found.blockId);
    if (found.frameId !== getActiveFrameId()) applyDocument(document, found.frameId);
    return null;
  }, [applyDocument, getActiveFrameId, getDocument, setTarget]);

  const createGrammarBlock = useCallback((grammarId: string, props: ContextFreeGrammarBlockProps): GrammarError | null => {
    const document = getDocument();
    if (readGrammarsFromCanvas(document).some((item) => item.grammarId === grammarId))
      return { code: "DUPLICATE_ID", message: "CFG " + grammarId + " already has a Puck block." };
    const frameId = getActiveFrameId();
    let result = applyCanvasAction(document, frameId, { action: "add_context_free_grammar_block", contextFreeGrammar: props });
    if (result.message === FRAME_CONTENT_LIMIT_MESSAGE) {
      const withFrame = applyCanvasAction(document, frameId, { action: "add_frame", title: "CFG — " + grammarId });
      result = applyCanvasAction(withFrame.document, withFrame.activeSlideId, { action: "add_context_free_grammar_block", contextFreeGrammar: props });
    }
    if (result.message === FRAME_CONTENT_LIMIT_MESSAGE)
      return { code: "INVALID_OPERATION", message: "There is no room for a CFG block on the frame." };
    const created = readGrammarsFromFrame(result.document, result.activeSlideId).find((item) => item.grammarId === grammarId);
    if (!created) return { code: "INVALID_OPERATION", message: "The CFG block could not be created." };
    applyDocument(result.document, result.activeSlideId);
    setTarget(created.blockId);
    return null;
  }, [applyDocument, getActiveFrameId, getDocument, setTarget]);

  const updateGrammarBlock = useCallback((grammarId: string, props: ContextFreeGrammarBlockProps): GrammarError | null => {
    const document = getDocument();
    const found = readGrammarsFromCanvas(document).find((item) => item.grammarId === grammarId);
    if (!found) return { code: "GRAMMAR_NOT_FOUND", message: "CFG " + grammarId + " has no Puck block." };
    const result = applyCanvasAction(document, found.frameId, {
      action: "set_context_free_grammar_block", componentId: found.blockId,
      contextFreeGrammar: reconcileContextFreeGrammarProps(props, found.props),
    });
    if (result.message?.startsWith("Could not find"))
      return { code: "GRAMMAR_NOT_FOUND", message: "CFG " + grammarId + " has no Puck block." };
    applyDocument(result.document, result.activeSlideId);
    setTarget(found.blockId);
    return null;
  }, [applyDocument, getDocument, setTarget]);

  return { targetBlockId, adoptFrameGrammars, selectGrammarBlock, createGrammarBlock, updateGrammarBlock };
}
