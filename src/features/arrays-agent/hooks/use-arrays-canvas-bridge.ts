"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  generateArrayCode,
  parseArrayFromCode,
  type CodeLanguageName,
} from "@/features/arrays-agent/lib/array-code";
import {
  arrayNameFromTitle,
  DEFAULT_ARRAY_NAME,
  nextArrayName,
} from "@/features/arrays-agent/lib/array-name";
import type { ArrayValue } from "@/features/arrays-agent/lib/array-types";
import type {
  BlockControls,
  CombineControls,
} from "@/features/arrays-agent/tools/tool-context";
import {
  applyCanvasAction,
  FRAME_CONTENT_LIMIT_MESSAGE,
} from "@/features/canvas/lib/canvas-commands";
import type {
  CanvasAiAction,
  CanvasDocument,
  CodeLanguage,
} from "@/features/canvas/types/canvas-types";

type BlockLike = {
  type: string;
  props: {
    id: string;
    title?: string;
    text?: string;
    caption?: string;
    code?: string;
    language?: string;
    showIndices?: boolean;
    values?: Array<{ value: string }>;
  };
};

type SlideLike = {
  type: string;
  props: { id: string; title?: string; content?: BlockLike[] };
};

/** The authored array on a frame, as the agent needs to see it. */
export type FrameArraySnapshot = {
  blockId: string;
  values: string[];
  /** The variable name drawn beside the strip — A, B, C… */
  name: string;
  showIndices: boolean;
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
  return readArrayFromFrame(document, frameId)?.blockId ?? null;
}

/**
 * Read the array already authored on a frame.
 *
 * This is what stops the agent talking about an array that isn't the one on
 * screen: without it the agent starts every session believing the board is
 * empty, so "add two more elements" appends to nothing and silently replaces
 * the teacher's array with a one-element one.
 */
export function readArrayFromFrame(
  document: CanvasDocument,
  frameId: string | null,
): FrameArraySnapshot | null {
  const slide = slidesOf(document).find((item) => item.props.id === frameId);
  const arrays = (slide?.props.content ?? []).filter(
    (item) => item.type === "ArrayBlock",
  );
  const block = arrays[arrays.length - 1];
  if (!block) return null;

  return {
    blockId: block.props.id,
    values: (block.props.values ?? []).map((entry) => String(entry.value)),
    name: arrayNameFromTitle(block.props.title),
    showIndices: block.props.showIndices ?? true,
  };
}

/** Every array block on a frame, in layout order. */
function arrayBlocksOf(document: CanvasDocument, frameId: string | null): BlockLike[] {
  const slide = slidesOf(document).find((item) => item.props.id === frameId);
  return (slide?.props.content ?? []).filter((item) => item.type === "ArrayBlock");
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

  /**
   * A code block the teacher asked to mirror the array. While one is linked,
   * every committed change rewrites it, so the code and the strip can never
   * drift apart on screen.
   */
  const linkedCodeRef = useRef<{
    blockId: string;
    language: CodeLanguageName;
  } | null>(null);

  /** Write settled values into the document — called when an animation ends. */
  const commitValues = useCallback(
    (values: ArrayValue[], arrayName = "A") => {
      const document = getDocument();
      const frameId = getActiveFrameId();
      const blockId = targetBlockIdRef.current ?? findArrayBlockOnFrame(document, frameId);

      if (!blockId) {
        // Nothing to write into yet — the next ensureArrayBlock will create it.
        return;
      }

      setTarget(blockId);
      let result = applyCanvasAction(document, frameId, {
        action: "set_array_values",
        componentId: blockId,
        values,
      });

      const linked = linkedCodeRef.current;
      if (linked) {
        result = applyCanvasAction(result.document, result.activeSlideId, {
          action: "set_code_block",
          componentId: linked.blockId,
          code: generateArrayCode(arrayName, values, linked.language),
        });
      }
      applyDocument(result.document, result.activeSlideId);
    },
    [applyDocument, getActiveFrameId, getDocument, setTarget],
  );

  /**
   * Several arrays on one frame — what concatenation and element-wise
   * addition need. The sources stay put and the result gets its own block, so
   * the class can see all three at once.
   */
  const combineControls = useMemo<CombineControls>(() => {
    const addArray = (values: ArrayValue[], name?: string): string | null => {
      const document = getDocument();
      const frameId = getActiveFrameId();
      const existing = arrayBlocksOf(document, frameId).map((block) =>
        arrayNameFromTitle(block.props.title),
      );
      const title = name ?? nextArrayName(existing);

      const result = applyCanvasAction(document, frameId, {
        action: "add_array_block",
        title,
        values,
      });
      // Deliberately no overflow onto a new frame: arrays being combined are
      // only meaningful side by side.
      if (result.message === FRAME_CONTENT_LIMIT_MESSAGE) return null;

      applyDocument(result.document, result.activeSlideId);
      const created = arrayBlocksOf(result.document, result.activeSlideId).at(-1);
      setTarget(created?.props.id ?? null);
      return title;
    };

    return {
      list() {
        return arrayBlocksOf(getDocument(), getActiveFrameId()).map((block) => ({
          blockId: block.props.id,
          name: arrayNameFromTitle(block.props.title),
          values: (block.props.values ?? []).map((entry) => String(entry.value)),
        }));
      },
      addArray,
      useResult(name) {
        const document = getDocument();
        const frameId = getActiveFrameId();
        const blocks = arrayBlocksOf(document, frameId);
        const existing = name
          ? blocks.find((block) => arrayNameFromTitle(block.props.title) === name)
          : undefined;

        if (existing) {
          setTarget(existing.props.id);
          return arrayNameFromTitle(existing.props.title);
        }
        return addArray(
          [],
          name ?? nextArrayName(blocks.map((block) => arrayNameFromTitle(block.props.title))),
        );
      },
    };
  }, [applyDocument, getActiveFrameId, getDocument, setTarget]);

  const releaseTarget = useCallback(() => {
    setTarget(null);
    linkedCodeRef.current = null;
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
      add({ type, text, code, language, explanation }) {
        const action: CanvasAiAction =
          type === "heading"
            ? { action: "add_text_block", heading: text }
            : type === "subheading"
              ? { action: "add_subheading_block", text }
              : type === "body"
                ? { action: "add_body_block", text }
                : {
                    action: "add_code_block",
                    code: code ?? "",
                    language: (language ?? "javascript") as CodeLanguage,
                    explanation,
                  };

        const { result, overflowed } = applyWithOverflow(action, text?.slice(0, 40) ?? "Code");
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
          code: "CodeBlock",
          array: "ArrayBlock",
        }[target];

        const document = getDocument();
        const frameId = getActiveFrameId();
        const result = applyCanvasAction(document, frameId, {
          action: "remove_block",
          blockType,
        });
        applyDocument(result.document, result.activeSlideId);

        if (blockType === "ArrayBlock") setTarget(null);
        if (blockType === "CodeBlock") linkedCodeRef.current = null;
        return result.message;
      },

      linkCode(language) {
        const snapshot = readArrayFromFrame(getDocument(), getActiveFrameId());
        const name = snapshot?.name ?? DEFAULT_ARRAY_NAME;
        const values = snapshot?.values ?? [];
        const lang = language as CodeLanguageName;

        const { result, overflowed } = applyWithOverflow(
          {
            action: "add_code_block",
            title: `${name} in ${language}`,
            language: lang as CodeLanguage,
            code: generateArrayCode(name, values, lang),
            explanation: "This updates automatically as the array changes.",
          },
          `${name} in ${language}`,
        );

        // Remember which block to rewrite on every later commit.
        const slide = slidesOf(result.document).find(
          (item) => item.props.id === result.activeSlideId,
        );
        const codeBlocks = (slide?.props.content ?? []).filter(
          (item) => item.type === "CodeBlock",
        );
        const created = codeBlocks[codeBlocks.length - 1];
        linkedCodeRef.current = created
          ? { blockId: created.props.id, language: lang }
          : null;

        return created
          ? `Added a ${language} code block mirroring ${name}. It will stay in sync as the array changes.${overflowed ? " The frame was full, so it went on a new frame." : ""}`
          : "Could not add the code block to this frame.";
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
        // The new frame becomes the working one; its array (a copy's, or none)
        // is adopted by the frame-change effect.
        setTarget(null);
        linkedCodeRef.current = null;

        const frames = slidesOf(result.document);
        const position = frames.findIndex((item) => item.props.id === result.activeSlideId) + 1;
        return copyCurrent
          ? `Duplicated the frame. You are now on frame ${position} of ${frames.length}.`
          : `Added frame ${position} of ${frames.length}${title ? ` — "${title}"` : ""}, and moved to it.`;
      },

      clearFrame() {
        const document = getDocument();
        const frameId = getActiveFrameId();
        const result = applyCanvasAction(document, frameId, { action: "clear_frame" });
        applyDocument(result.document, result.activeSlideId);
        setTarget(null);
        linkedCodeRef.current = null;
        return result.message;
      },

      readCodeArray() {
        const slide = slidesOf(getDocument()).find(
          (item) => item.props.id === getActiveFrameId(),
        );
        const block = (slide?.props.content ?? []).find(
          (item) => item.type === "CodeBlock",
        );
        return block?.props.code ? parseArrayFromCode(block.props.code) : null;
      },
    }),
    [applyDocument, applyWithOverflow, getActiveFrameId, getDocument, setTarget],
  );

  /**
   * Adopt whatever array is on the given frame as the agent's working array.
   * Returns null when the frame has none, so the caller can decide whether to
   * clear the agent's state or leave it alone.
   */
  const adoptFrameArray = useCallback(
    (frameId: string | null) => {
      const found = readArrayFromFrame(getDocument(), frameId);
      setTarget(found?.blockId ?? null);
      return found;
    },
    [getDocument, setTarget],
  );

  return {
    /** Block the agent is driving — pass to ArraysAgentViewProvider. */
    targetBlockId,
    adoptFrameArray,
    blockControls,
    combineControls,
    commitValues,
    ensureArrayBlock,
    releaseTarget,
  };
}
