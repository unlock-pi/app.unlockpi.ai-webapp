"use client";

import { useCallback, useRef, useState } from "react";

import {
  toAutomaton,
  toAutomatonBlockProps,
  type AutomatonBlockProps,
} from "@/components/automata";
import type { Automaton } from "@/components/automata/model";
import {
  applyCanvasAction,
  FRAME_CONTENT_LIMIT_MESSAGE,
} from "@/features/canvas/lib/canvas-commands";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";

type BlockLike = {
  type: string;
  props: Record<string, unknown> & { id: string };
};

type SlideLike = {
  type: string;
  props: { id: string; content?: BlockLike[] };
};

export type FrameAutomatonSnapshot = {
  frameId: string;
  blockId: string;
  automaton: Automaton;
  input: string;
  showTransitionTable: boolean;
};

type BridgeArgs = {
  getDocument: () => CanvasDocument;
  getActiveFrameId: () => string | null;
  applyDocument: (document: CanvasDocument, activeFrameId: string | null) => void;
};

function slidesOf(document: CanvasDocument) {
  return (document.content as unknown as SlideLike[]).filter(
    (item) => item.type === "SlideBlock",
  );
}

export function readAutomataFromFrame(
  document: CanvasDocument,
  frameId: string | null,
): FrameAutomatonSnapshot[] {
  const slide = slidesOf(document).find((item) => item.props.id === frameId);
  return (slide?.props.content ?? [])
    .filter((item) => item.type === "AutomatonBlock")
    .map((block) => {
      const props = block.props as unknown as AutomatonBlockProps & { id: string };
      return {
        frameId: frameId ?? "",
        blockId: props.id,
        automaton: toAutomaton(props),
        input: props.input ?? "",
        showTransitionTable: props.showTransitionTable ?? true,
      };
    });
}

export function useAutomataCanvasBridge({
  getDocument,
  getActiveFrameId,
  applyDocument,
}: BridgeArgs) {
  const targetBlockIdRef = useRef<string | null>(null);
  const automatonBlocksRef = useRef(new Map<string, string>());
  const [targetBlockId, setTargetBlockId] = useState<string | null>(null);

  const setTarget = useCallback((blockId: string | null) => {
    targetBlockIdRef.current = blockId;
    setTargetBlockId(blockId);
  }, []);

  const adoptFrameAutomata = useCallback(
    (frameId: string | null) => {
      const document = getDocument();
      const current = readAutomataFromFrame(document, frameId);
      const snapshots = [
        ...current,
        ...slidesOf(document)
          .filter((slide) => slide.props.id !== frameId)
          .flatMap((slide) => readAutomataFromFrame(document, slide.props.id)),
      ];
      automatonBlocksRef.current = new Map(
        snapshots.map((snapshot) => [snapshot.automaton.id, snapshot.blockId]),
      );
      setTarget(current[0]?.blockId ?? null);
      return snapshots;
    },
    [getDocument, setTarget],
  );

  const selectAutomaton = useCallback(
    (automatonId: string | null) => {
      if (!automatonId) {
        setTarget(null);
        return;
      }
      const document = getDocument();
      const snapshot = slidesOf(document)
        .flatMap((slide) => readAutomataFromFrame(document, slide.props.id))
        .find((candidate) => candidate.automaton.id === automatonId);
      if (snapshot) {
        automatonBlocksRef.current.set(automatonId, snapshot.blockId);
        setTarget(snapshot.blockId);
        if (snapshot.frameId !== getActiveFrameId()) {
          applyDocument(document, snapshot.frameId);
        }
      } else {
        setTarget(null);
      }
    },
    [applyDocument, getActiveFrameId, getDocument, setTarget],
  );

  const ensureAutomatonBlock = useCallback(
    (automaton: Automaton, input = "") => {
      const document = getDocument();
      const frameId = getActiveFrameId();
      const existing = readAutomataFromFrame(document, frameId).find(
        (snapshot) => snapshot.automaton.id === automaton.id,
      );
      if (existing) {
        const result = applyCanvasAction(document, frameId, {
          action: "set_automaton_block",
          componentId: existing.blockId,
          automaton: toAutomatonBlockProps(
            automaton,
            input,
            existing.showTransitionTable,
          ),
        });
        applyDocument(result.document, result.activeSlideId);
        automatonBlocksRef.current.set(automaton.id, existing.blockId);
        setTarget(existing.blockId);
        return existing.blockId;
      }

      let result = applyCanvasAction(document, frameId, {
        action: "add_automaton_block",
        automaton: toAutomatonBlockProps(automaton, input),
      });
      if (result.message === FRAME_CONTENT_LIMIT_MESSAGE) {
        const withFrame = applyCanvasAction(document, frameId, {
          action: "add_frame",
          title: `${automaton.type.toUpperCase()} — ${automaton.id}`,
        });
        result = applyCanvasAction(withFrame.document, withFrame.activeSlideId, {
          action: "add_automaton_block",
          automaton: toAutomatonBlockProps(automaton, input),
        });
      }
      applyDocument(result.document, result.activeSlideId);
      const created = readAutomataFromFrame(result.document, result.activeSlideId)
        .find((snapshot) => snapshot.automaton.id === automaton.id);
      if (created) automatonBlocksRef.current.set(automaton.id, created.blockId);
      setTarget(created?.blockId ?? null);
      return created?.blockId ?? null;
    },
    [applyDocument, getActiveFrameId, getDocument, setTarget],
  );

  const commitAutomaton = useCallback(
    (automaton: Automaton, input = "") => {
      const document = getDocument();
      const frameId = getActiveFrameId();
      const blockId = automatonBlocksRef.current.get(automaton.id) ??
        targetBlockIdRef.current;
      if (!blockId) {
        ensureAutomatonBlock(automaton, input);
        return;
      }
      const existing = readAutomataFromFrame(document, frameId).find(
        (snapshot) => snapshot.blockId === blockId,
      );
      const result = applyCanvasAction(document, frameId, {
        action: "set_automaton_block",
        componentId: blockId,
        automaton: toAutomatonBlockProps(
          automaton,
          input,
          existing?.showTransitionTable ?? true,
        ),
      });
      applyDocument(result.document, result.activeSlideId);
      automatonBlocksRef.current.set(automaton.id, blockId);
      setTarget(blockId);
    },
    [applyDocument, ensureAutomatonBlock, getActiveFrameId, getDocument, setTarget],
  );

  return {
    targetBlockId,
    adoptFrameAutomata,
    commitAutomaton,
    ensureAutomatonBlock,
    selectAutomaton,
  };
}
