"use client";

import { useCallback, useRef, useState } from "react";

import type { RegularExpressionBlockProps } from "@/components/regular-expression";
import { reconcileRegularExpressionProps } from "@/components/regular-expression/authoring";
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

export type FrameRegularExpressionSnapshot = {
  frameId: string;
  blockId: string;
  props: RegularExpressionBlockProps;
};

type BridgeArgs = {
  getDocument: () => CanvasDocument;
  getActiveFrameId: () => string | null;
  applyDocument: (
    document: CanvasDocument,
    activeFrameId: string | null,
  ) => void;
};

function slidesOf(document: CanvasDocument) {
  return (document.content as unknown as SlideLike[]).filter(
    (item) => item.type === "SlideBlock",
  );
}

export function readRegularExpressionsFromFrame(
  document: CanvasDocument,
  frameId: string | null,
): FrameRegularExpressionSnapshot[] {
  const slide = slidesOf(document).find((item) => item.props.id === frameId);
  return (slide?.props.content ?? [])
    .filter((item) => item.type === "RegularExpressionBlock")
    .map((block) => ({
      frameId: frameId ?? "",
      blockId: block.props.id,
      props: reconcileRegularExpressionProps(
        block.props as unknown as RegularExpressionBlockProps,
      ),
    }));
}

function blockProps(
  expression: string,
  input: string,
  previous?: RegularExpressionBlockProps,
): RegularExpressionBlockProps {
  return reconcileRegularExpressionProps(
    {
      expression,
      input,
      displayMode: previous?.displayMode ?? "expression",
      expressionSegments: [],
      syntaxTree: null,
      constructionSteps: [],
      showSyntaxTree: previous?.showSyntaxTree ?? true,
      showConstruction: previous?.showConstruction ?? true,
      showInput: previous?.showInput ?? true,
      showExecutionControls: previous?.showExecutionControls ?? true,
    },
    previous,
  );
}

export function useRegularExpressionCanvasBridge({
  getDocument,
  getActiveFrameId,
  applyDocument,
}: BridgeArgs) {
  const targetBlockIdRef = useRef<string | null>(null);
  const [targetBlockId, setTargetBlockId] = useState<string | null>(null);

  const setTarget = useCallback((blockId: string | null) => {
    targetBlockIdRef.current = blockId;
    setTargetBlockId(blockId);
  }, []);

  const adoptFrameRegularExpressions = useCallback(
    (frameId: string | null) => {
      const document = getDocument();
      const current = readRegularExpressionsFromFrame(document, frameId);
      setTarget(current.at(-1)?.blockId ?? null);
      return current;
    },
    [getDocument, setTarget],
  );

  const ensureRegularExpressionBlock = useCallback(
    (expression: string, input = "") => {
      const document = getDocument();
      const frameId = getActiveFrameId();
      const existing = readRegularExpressionsFromFrame(document, frameId).at(
        -1,
      );

      if (existing) {
        const result = applyCanvasAction(document, frameId, {
          action: "set_regular_expression_block",
          componentId: existing.blockId,
          regularExpression: blockProps(expression, input, existing.props),
        });
        setTarget(existing.blockId);
        applyDocument(result.document, result.activeSlideId);
        return existing.blockId;
      }

      let result = applyCanvasAction(document, frameId, {
        action: "add_regular_expression_block",
        regularExpression: blockProps(expression, input),
      });
      if (result.message === FRAME_CONTENT_LIMIT_MESSAGE) {
        const withFrame = applyCanvasAction(document, frameId, {
          action: "add_frame",
          title: `Regular expression — ${expression}`,
        });
        result = applyCanvasAction(
          withFrame.document,
          withFrame.activeSlideId,
          {
            action: "add_regular_expression_block",
            regularExpression: blockProps(expression, input),
          },
        );
      }

      const created = readRegularExpressionsFromFrame(
        result.document,
        result.activeSlideId,
      ).at(-1);
      setTarget(created?.blockId ?? null);
      applyDocument(result.document, result.activeSlideId);
      return created?.blockId ?? null;
    },
    [applyDocument, getActiveFrameId, getDocument, setTarget],
  );

  const commitRegularExpression = useCallback(
    (expression: string, input = "") => {
      const document = getDocument();
      const blockId = targetBlockIdRef.current;
      if (!blockId) {
        ensureRegularExpressionBlock(expression, input);
        return;
      }

      const existing = slidesOf(document)
        .flatMap((slide) =>
          readRegularExpressionsFromFrame(document, slide.props.id),
        )
        .find((snapshot) => snapshot.blockId === blockId);
      if (!existing) {
        ensureRegularExpressionBlock(expression, input);
        return;
      }

      const result = applyCanvasAction(document, existing.frameId, {
        action: "set_regular_expression_block",
        componentId: blockId,
        regularExpression: blockProps(expression, input, existing.props),
      });
      applyDocument(result.document, result.activeSlideId);
      setTarget(blockId);
    },
    [applyDocument, ensureRegularExpressionBlock, getDocument, setTarget],
  );

  return {
    targetBlockId,
    adoptFrameRegularExpressions,
    commitRegularExpression,
    ensureRegularExpressionBlock,
  };
}
