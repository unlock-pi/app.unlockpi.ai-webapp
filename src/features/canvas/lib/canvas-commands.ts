import {
  canPushStack,
  clampStackToCapacity,
  popStack,
  pushStack,
  type StackCapacity,
} from "@/components/data-structure/stack-model";
import type { AutomatonBlockProps } from "@/components/automata";
import type {
  ArrayBlockProps,
  CanvasAiAction,
  CanvasCommandResult,
  CanvasDocument,
  SlideBlockProps,
  StackBlockProps,
} from "@/features/canvas/types/canvas-types";
import { createCanvasId } from "@/features/canvas/lib/canvas-templates";

const DEFAULT_STACK_SIZE = 5;

type CanvasItem = CanvasDocument["content"][number];
type FrameContentItem = { type: string; props: Record<string, unknown> };
type SlideItem = CanvasItem & {
  type: "SlideBlock";
  props: SlideBlockProps & { id: string; content: CanvasItem[] };
};
type ArrayItem = CanvasItem & { type: "ArrayBlock"; props: ArrayBlockProps & { id: string } };
type StackItem = CanvasItem & { type: "StackBlock"; props: StackBlockProps & { id: string } };
type AutomatonItem = CanvasItem & {
  type: "AutomatonBlock";
  props: AutomatonBlockProps & { id: string };
};

function cloneDocument(document: CanvasDocument): CanvasDocument {
  return structuredClone(document);
}

function cloneItemWithNewIds(item: CanvasItem): CanvasItem {
  const clonedItem = structuredClone(item);
  const props = clonedItem.props as { id?: string; content?: CanvasItem[] };

  if (props.id) {
    props.id = createCanvasId(String(clonedItem.type).replace(/Block$/, "").toLowerCase());
  }

  if (Array.isArray(props.content)) {
    props.content = props.content.map(cloneItemWithNewIds);
  }

  return clonedItem;
}

function isSlideItem(item: CanvasItem): item is SlideItem {
  return item.type === "SlideBlock";
}

function isArrayItem(item: CanvasItem): item is ArrayItem {
  return item.type === "ArrayBlock";
}

function isStackItem(item: CanvasItem): item is StackItem {
  return item.type === "StackBlock";
}

function isAutomatonItem(item: CanvasItem): item is AutomatonItem {
  return item.type === "AutomatonBlock";
}

/** Builds the `StackCapacity` a given stack block currently enforces. */
function stackCapacityOf(stack: StackItem): StackCapacity {
  return stack.props.isFixed
    ? { isFixed: true, size: stack.props.stackSize ?? DEFAULT_STACK_SIZE }
    : { isFixed: false };
}

function getSlides(document: CanvasDocument) {
  return document.content.filter(isSlideItem);
}

/**
 * Layout units for a 16:9 frame. Text uses its actual length, while visual
 * blocks reserve the height their default rendering needs. This deliberately
 * is not a component count: a heading, subheading, and short body leave room
 * for more material, whereas a table or diagram consumes more of the frame.
 */
const FRAME_CONTENT_BUDGET = 8;
export const FRAME_CONTENT_LIMIT_MESSAGE =
  "This content would not fit in the 16:9 frame at its default size. Add a new frame to keep everything visible.";

function textLines(value: unknown, charactersPerLine: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return Math.max(1, Math.ceil(text.length / charactersPerLine));
}

function itemLayoutCost(item: FrameContentItem) {
  const props = item.props;

  switch (item.type) {
    case "HeadingTextBlock":
      return 0.6 + textLines(props.text, 28) * 0.35;
    case "SubheadingTextBlock":
      return 0.45 + textLines(props.text, 42) * 0.25;
    case "BodyTextBlock":
      return 0.35 + textLines(props.text, 100) * 0.35;
    case "CheckpointBlock":
      return (
        1.25 +
        textLines(props.question, 65) * 0.3 +
        textLines(props.answer, 90) * 0.3
      );
    case "CodeBlock":
      return 1.3 + textLines(props.code, 55) * 0.32;
    case "TableBlock": {
      const rows = Array.isArray(props.rows) ? props.rows.length : 0;
      return 1.5 + Math.max(1, rows) * 0.55;
    }
    case "StackBlock": {
      const values = Array.isArray(props.values) ? props.values.length : 0;
      return 1.9 + Math.max(1, values) * 0.35;
    }
    // An array block draws only the strip — no title or caption — so it
    // reserves a fixed height whatever copy happens to be stored on it.
    case "ArrayBlock":
      return 1.9;
    case "QueueBlock":
    case "LinkedListBlock": {
      // Optional title/caption rows consume real vertical space. Once the
      // teacher removes them, the visual can move up and leaves more room for
      // the rest of the frame.
      const titleCost = typeof props.title === "string" && props.title.trim() ? 0.45 : 0;
      const captionCost =
        typeof props.caption === "string" && props.caption.trim() ? 0.35 : 0;
      return 1.9 + titleCost + captionCost;
    }
    case "MindMapBlock":
    case "MermaidBlock":
    case "SketchBlock":
      return 3.5;
    case "AutomatonBlock":
      return 7.5;
    default:
      return 2;
  }
}

export function getFrameContentUsage(
  document: CanvasDocument,
  frameId: string | null,
) {
  const frame = getSlides(document).find((slide) => slide.props.id === frameId);
  const used = frame
    ? getSlideContent(frame).reduce(
        (total, item) => total + itemLayoutCost(item as FrameContentItem),
        0,
      )
    : 0;
  const percent = Math.min(100, Math.round((used / FRAME_CONTENT_BUDGET) * 100));

  return { isFull: used >= FRAME_CONTENT_BUDGET, percent, used };
}

export function canAddBlockToFrame(
  content: readonly FrameContentItem[],
  item: FrameContentItem,
) {
  return (
    [...content, item].reduce((total, next) => total + itemLayoutCost(next), 0) <=
    FRAME_CONTENT_BUDGET
  );
}

/** True only when a change makes a frame exceed its content-based capacity. */
export function addsContentPastFrameCapacity(
  previousDocument: CanvasDocument,
  nextDocument: CanvasDocument,
) {
  const previousCosts = new Map(
    getSlides(previousDocument).map((slide) => [
      slide.props.id,
      getSlideContent(slide).reduce(
        (total, item) => total + itemLayoutCost(item as FrameContentItem),
        0,
      ),
    ]),
  );

  return getSlides(nextDocument).some((slide) => {
    const nextCost = getSlideContent(slide).reduce(
      (total, item) => total + itemLayoutCost(item as FrameContentItem),
      0,
    );
    const previousCost = previousCosts.get(slide.props.id) ?? 0;
    return nextCost > FRAME_CONTENT_BUDGET && nextCost > previousCost;
  });
}

export function normalizeCanvasFrames(document: CanvasDocument): CanvasDocument {
  const nextDocument = cloneDocument(document);

  getSlides(nextDocument).forEach((slide, index) => {
    slide.props.frameLabel = `Frame ${index + 1}`;
    slide.props.title = slide.props.title?.trim() || `Frame ${index + 1}`;
  });

  return nextDocument;
}

function getSlideContent(slide: SlideItem): CanvasItem[] {
  return Array.isArray(slide.props.content) ? slide.props.content : [];
}

function getActiveSlide(document: CanvasDocument, activeSlideId: string | null) {
  const slides = getSlides(document);
  return slides.find((slide) => slide.props.id === activeSlideId) ?? slides[0] ?? null;
}

/**
 * Pick the array the AI/user is talking about.
 *
 * Precedence (this order matters — the previous version just returned the
 * first array anywhere in the document, so "add an element" and "pop" kept
 * hitting the wrong array when the active slide had several):
 *   1. Explicit id (componentId) — never overridden if present.
 *   2. Highlighted array on the active slide — if one is currently
 *      highlighted, that's what the teacher is discussing.
 *   3. Most-recent array on the active slide — the last one appended, i.e.
 *      the one just added or being built up live.
 *   4. First array on the active slide — as a fall-back before leaving the
 *      slide at all.
 *   5. First array anywhere — last-resort so a stale reference still resolves.
 */
function getTargetArray(
  document: CanvasDocument,
  componentId?: string,
  activeSlideId?: string | null,
) {
  if (componentId) {
    for (const slide of getSlides(document)) {
      const match = getSlideContent(slide).find(
        (item): item is ArrayItem =>
          isArrayItem(item) && item.props.id === componentId,
      );
      if (match) return match;
    }
    return null;
  }

  const activeSlide = getActiveSlide(document, activeSlideId ?? null);
  if (activeSlide) {
    const arraysOnActive = getSlideContent(activeSlide).filter(isArrayItem);
    if (arraysOnActive.length) {
      const highlighted = arraysOnActive.find(
        (array) => typeof array.props.highlightedIndex === "number",
      );
      if (highlighted) return highlighted;
      return arraysOnActive[arraysOnActive.length - 1];
    }
  }

  for (const slide of getSlides(document)) {
    const array = getSlideContent(slide).find(isArrayItem);
    if (array) return array;
  }
  return null;
}

function getArrays(document: CanvasDocument) {
  return getSlides(document).flatMap((slide) => getSlideContent(slide).filter(isArrayItem));
}

function getTargetAutomaton(
  document: CanvasDocument,
  componentId: string | undefined,
  activeSlideId: string | null,
) {
  const active = getActiveSlide(document, activeSlideId);
  const onActive = active ? getSlideContent(active).filter(isAutomatonItem) : [];
  if (componentId) {
    return onActive.find((item) => item.props.id === componentId) ??
      getSlides(document)
        .flatMap((slide) => getSlideContent(slide))
        .find((item): item is AutomatonItem =>
          isAutomatonItem(item) && item.props.id === componentId,
        ) ??
      null;
  }
  return onActive.at(-1) ?? null;
}

/**
 * Pick the stack the AI/user is talking about. Same precedence as
 * `getTargetArray` — kept as a separate function rather than a shared
 * generic because the two item shapes (`ArrayItem` vs `StackItem`) differ
 * and a premature abstraction here would cost more than the ~15 lines of
 * duplication it would save:
 *   1. Explicit id (componentId).
 *   2. Highlighted stack on the active slide.
 *   3. Most-recently-added stack on the active slide.
 *   4. First stack on the active slide.
 *   5. First stack anywhere.
 */
function getTargetStack(
  document: CanvasDocument,
  componentId?: string,
  activeSlideId?: string | null,
) {
  if (componentId) {
    for (const slide of getSlides(document)) {
      const match = getSlideContent(slide).find(
        (item): item is StackItem =>
          isStackItem(item) && item.props.id === componentId,
      );
      if (match) return match;
    }
    return null;
  }

  const activeSlide = getActiveSlide(document, activeSlideId ?? null);
  if (activeSlide) {
    const stacksOnActive = getSlideContent(activeSlide).filter(isStackItem);
    if (stacksOnActive.length) {
      const highlighted = stacksOnActive.find(
        (stack) => typeof stack.props.highlightedIndex === "number",
      );
      if (highlighted) return highlighted;
      return stacksOnActive[stacksOnActive.length - 1];
    }
  }

  for (const slide of getSlides(document)) {
    const stack = getSlideContent(slide).find(isStackItem);
    if (stack) return stack;
  }
  return null;
}

function normalizeArrayValues(values: string[]) {
  return values.map((value) => ({ value }));
}

function createHeadingTextItem(text: string): CanvasItem {
  return {
    type: "HeadingTextBlock",
    props: {
      id: createCanvasId("heading"),
      text,
    },
  };
}

type FrameInsertResult = { inserted: boolean; slideId: string };

function pushIntoActiveSlide(
  document: CanvasDocument,
  activeSlideId: string | null,
  item: CanvasItem
): FrameInsertResult {
  let slide = getActiveSlide(document, activeSlideId);

  if (!slide) {
    slide = {
      type: "SlideBlock",
      props: {
        id: createCanvasId("slide"),
        frameLabel: "Frame 1",
        title: "Frame 1",
        teachingBeat: "hook",
        content: [],
      },
    };
    document.content.push(slide);
  }

  const content = getSlideContent(slide);
  if (!canAddBlockToFrame(content as FrameContentItem[], item as FrameContentItem)) {
    return { inserted: false, slideId: slide.props.id };
  }

  slide.props.content = [...content, item];

  return { inserted: true, slideId: slide.props.id };
}

/**
 * Find one block on the active frame, by id when given and otherwise by type.
 *
 * Type is the useful fallback because that is how a teacher refers to these:
 * "change the subheading" means the subheading on the frame they are looking
 * at, and there is normally exactly one.
 */
function findBlockOnSlide(
  document: CanvasDocument,
  slideId: string | null,
  blockType: string,
  componentId?: string,
): CanvasItem | null {
  const slide = getSlides(document).find((item) => item.props.id === slideId);
  if (!slide) return null;

  const content = getSlideContent(slide);
  if (componentId) {
    return (
      content.find((item) => (item.props as { id?: string }).id === componentId) ?? null
    );
  }
  return content.find((item) => item.type === blockType) ?? null;
}

/** Human name for a block type, for messages the AI reads back to the class. */
function blockLabel(blockType: string): string {
  const labels: Record<string, string> = {
    HeadingTextBlock: "heading",
    SubheadingTextBlock: "subheading",
    BodyTextBlock: "paragraph",
    CodeBlock: "code block",
    ArrayBlock: "array",
    StackBlock: "stack",
    QueueBlock: "queue",
    LinkedListBlock: "linked list",
    TableBlock: "table",
    MermaidBlock: "diagram",
    CheckpointBlock: "checkpoint",
    MindMapBlock: "mind map",
    SketchBlock: "drawing",
    AutomatonBlock: "automaton",
  };
  return labels[blockType] ?? blockType.replace(/Block$/, "").toLowerCase();
}

export function getInitialSlideId(document: CanvasDocument): string | null {
  return getSlides(document)[0]?.props.id ?? null;
}

export function summarizeCanvas(document: CanvasDocument, activeSlideId: string | null) {
  const slides = getSlides(document);
  const arrays = getArrays(document);
  const activeSlide = getActiveSlide(document, activeSlideId);

  return [
    `Title: ${document.root?.props?.title ?? "Untitled canvas"}`,
    `Frames: ${slides.length}`,
    activeSlide ? `Active frame: ${activeSlide.props.title}` : "Active frame: none",
    arrays.length
      ? `Arrays: ${arrays
          .map((array) => `${array.props.title}=[${array.props.values.map((item) => item.value).join(", ")}]`)
          .join("; ")}`
      : "Arrays: none",
  ].join("\n");
}

export function applyCanvasAction(
  document: CanvasDocument,
  activeSlideId: string | null,
  action: CanvasAiAction
): CanvasCommandResult {
  const nextDocument = cloneDocument(document);
  let nextSlideId = activeSlideId;
  let message = "Command applied.";

  if (action.action === "add_slide" || action.action === "add_frame") {
    const id = createCanvasId("slide");
    nextDocument.content.push({
      type: "SlideBlock",
      props: {
        id,
        frameLabel: `Frame ${getSlides(nextDocument).length + 1}`,
        title: action.title?.trim() || `Frame ${getSlides(nextDocument).length + 1}`,
        teachingBeat: "explain",
        //notes: action.notes?.trim() || "Add teaching notes for this frame.",
        content: [],
      },
    });
    nextSlideId = id;
    message = "Added a new frame and selected it.";
  }

  if (action.action === "add_frame_below") {
    const slides = getSlides(nextDocument);
    const targetId = action.frameId ?? activeSlideId;
    const targetIndex = slides.findIndex((slide) => slide.props.id === targetId);
    const insertIndex = targetIndex >= 0 ? targetIndex + 1 : slides.length;
    const id = createCanvasId("slide");
    nextDocument.content.splice(insertIndex, 0, {
      type: "SlideBlock",
      props: {
        id,
        frameLabel: `Frame ${slides.length + 1}`,
        title: action.title?.trim() || `Frame ${slides.length + 1}`,
        teachingBeat: "explain",
        //notes: action.notes?.trim() || "Add teaching notes for this frame.",
        content: [],
      },
    });
    nextSlideId = id;
    message = "Added a frame below and selected it.";
  }

  if (action.action === "duplicate_frame") {
    const slides = getSlides(nextDocument);
    const targetId = action.frameId ?? activeSlideId;
    const targetIndex = slides.findIndex((slide) => slide.props.id === targetId);
    const targetSlide = targetIndex >= 0 ? slides[targetIndex] : null;

    if (targetSlide) {
      const duplicate = cloneItemWithNewIds(targetSlide) as SlideItem;
      duplicate.props.title = `${targetSlide.props.title} copy`;
      nextDocument.content.splice(targetIndex + 1, 0, duplicate);
      nextSlideId = duplicate.props.id;
      message = "Duplicated the frame below.";
    } else {
      message = "Could not find a frame to duplicate.";
    }
  }

  if (action.action === "delete_frame") {
    const slides = getSlides(nextDocument);
    const targetId = action.frameId ?? activeSlideId;
    const targetIndex = slides.findIndex((slide) => slide.props.id === targetId);

    if (targetIndex >= 0 && slides.length > 1) {
      nextDocument.content.splice(targetIndex, 1);
      const remainingSlides = getSlides(nextDocument);
      nextSlideId =
        remainingSlides[Math.min(targetIndex, remainingSlides.length - 1)]?.props.id ?? null;
      message = "Deleted the frame.";
    } else if (slides.length <= 1) {
      message = "Keep at least one frame in the canvas.";
    } else {
      message = "Could not find a frame to delete.";
    }
  }

  if (action.action === "go_to_slide" || action.action === "go_to_frame") {
    const slides = getSlides(nextDocument);
    const requestedIndex =
      action.action === "go_to_slide" ? action.slideIndex : action.frameIndex;
    const requestedId = action.action === "go_to_slide" ? action.slideId : action.frameId;
    const slide =
      typeof requestedIndex === "number"
        ? slides[Math.max(0, Math.min(slides.length - 1, requestedIndex))]
        : slides.find((item) => item.props.id === requestedId);
    nextSlideId = slide?.props.id ?? nextSlideId;
    message = slide ? `Moved to ${slide.props.title}.` : "Could not find that frame.";
  }

  if (action.action === "update_slide_title" || action.action === "update_frame_title") {
    const requestedId = action.action === "update_slide_title" ? action.slideId : action.frameId;
    const slide = getSlides(nextDocument).find(
      (item) => item.props.id === (requestedId ?? activeSlideId)
    );
    if (slide) {
      slide.props.title = action.title;
      message = "Updated the active frame title.";
    } else {
      message = "Could not find a frame to update.";
    }
  }

  if (action.action === "add_text_block") {
    const result = pushIntoActiveSlide(
      nextDocument,
      nextSlideId,
      createHeadingTextItem(action.heading?.trim() || action.body?.trim() || "New heading")
    );
    nextSlideId = result.slideId;
    message = result.inserted ? "Added a heading block to the active frame." : FRAME_CONTENT_LIMIT_MESSAGE;
  }

  if (action.action === "add_subheading_block") {
    const result = pushIntoActiveSlide(nextDocument, nextSlideId, {
      type: "SubheadingTextBlock",
      props: {
        id: createCanvasId("subheading"),
        text: action.text?.trim() || "New subheading",
      },
    });
    nextSlideId = result.slideId;
    message = result.inserted
      ? "Added a subheading to the active frame."
      : FRAME_CONTENT_LIMIT_MESSAGE;
  }

  if (action.action === "add_body_block") {
    const result = pushIntoActiveSlide(nextDocument, nextSlideId, {
      type: "BodyTextBlock",
      props: {
        id: createCanvasId("body"),
        text: action.text?.trim() || "New paragraph",
      },
    });
    nextSlideId = result.slideId;
    message = result.inserted
      ? "Added a paragraph to the active frame."
      : FRAME_CONTENT_LIMIT_MESSAGE;
  }

  if (action.action === "add_code_block") {
    const result = pushIntoActiveSlide(nextDocument, nextSlideId, {
      type: "CodeBlock",
      props: {
        id: createCanvasId("code"),
        title: action.title?.trim() || "Code",
        language: action.language ?? "javascript",
        code: action.code ?? "",
        explanation: action.explanation?.trim() || "",
      },
    });
    nextSlideId = result.slideId;
    message = result.inserted
      ? "Added a code block to the active frame."
      : FRAME_CONTENT_LIMIT_MESSAGE;
  }

  if (action.action === "set_block_text") {
    const block = findBlockOnSlide(
      nextDocument,
      nextSlideId,
      action.blockType,
      action.componentId,
    );
    if (block) {
      (block.props as { text: string }).text = action.text;
      message = `Updated the ${blockLabel(action.blockType)}.`;
    } else {
      // Nothing to rewrite — add it instead, so "change the subheading" still
      // does the obvious thing on a frame that has no subheading yet.
      const created = pushIntoActiveSlide(nextDocument, nextSlideId, {
        type: action.blockType,
        props: { id: createCanvasId(action.blockType), text: action.text },
      } as CanvasItem);
      nextSlideId = created.slideId;
      message = created.inserted
        ? `That frame had no ${blockLabel(action.blockType)}, so one was added.`
        : FRAME_CONTENT_LIMIT_MESSAGE;
    }
  }

  if (action.action === "set_code_block") {
    const block = findBlockOnSlide(
      nextDocument,
      nextSlideId,
      "CodeBlock",
      action.componentId,
    );
    if (block) {
      const props = block.props as {
        code: string;
        language: string;
        explanation: string;
      };
      props.code = action.code;
      if (action.language) props.language = action.language;
      if (action.explanation !== undefined) props.explanation = action.explanation;
      message = "Updated the code block.";
    } else {
      message = "There is no code block on this frame to update.";
    }
  }

  if (action.action === "remove_block") {
    const slide = getSlides(nextDocument).find(
      (item) => item.props.id === nextSlideId,
    );
    const content = slide ? getSlideContent(slide) : [];
    const index = content.findIndex((item) =>
      action.componentId
        ? (item.props as { id?: string }).id === action.componentId
        : item.type === action.blockType,
    );

    if (slide && index >= 0) {
      const [removed] = content.splice(index, 1);
      slide.props.content = content;
      message = `Removed the ${blockLabel(String(removed.type))} from this frame.`;
    } else {
      message = "Could not find that block on the current frame.";
    }
  }

  if (action.action === "clear_frame") {
    const slide = getSlides(nextDocument).find(
      (item) => item.props.id === nextSlideId,
    );
    if (!slide) {
      message = "There is no frame showing to clear.";
    } else {
      const removed = getSlideContent(slide).length;
      slide.props.content = [];
      message = removed
        ? `Cleared ${removed} block(s) from this frame.`
        : "This frame was already empty.";
    }
  }

  if (action.action === "add_array_block") {
    const result = pushIntoActiveSlide(nextDocument, nextSlideId, {
      type: "ArrayBlock",
      props: {
        id: createCanvasId("array"),
        title: action.title?.trim() || "A",
        values: normalizeArrayValues(action.values?.length ? action.values : ["8", "5", "0", "1"]),
        highlightedIndex: undefined,
        showIndices: true,
        caption: "",
      },
    });
    nextSlideId = result.slideId;
    message = result.inserted ? "Added an editable array block to the active frame." : FRAME_CONTENT_LIMIT_MESSAGE;
  }

  if (action.action === "set_array_values") {
    const array = getTargetArray(nextDocument, action.componentId, nextSlideId);
    if (array) {
      array.props.values = normalizeArrayValues(action.values);
      if (
        typeof array.props.highlightedIndex === "number" &&
        array.props.highlightedIndex >= action.values.length
      ) {
        array.props.highlightedIndex = undefined;
      }
      message = `Updated ${array.props.title}.`;
    } else {
      message = "Could not find an array block to update.";
    }
  }

  if (action.action === "add_automaton_block") {
    const result = pushIntoActiveSlide(nextDocument, nextSlideId, {
      type: "AutomatonBlock",
      props: {
        id: createCanvasId("automaton"),
        ...structuredClone(action.automaton),
      },
    });
    nextSlideId = result.slideId;
    message = result.inserted
      ? "Added an automaton block to the active frame."
      : FRAME_CONTENT_LIMIT_MESSAGE;
  }

  if (action.action === "set_automaton_block") {
    const block = getTargetAutomaton(nextDocument, action.componentId, nextSlideId);
    if (block) {
      const componentId = block.props.id;
      block.props = {
        id: componentId,
        ...structuredClone(action.automaton),
      };
      message = `Updated ${action.automaton.automatonId ?? "the automaton"}.`;
    } else {
      message = "Could not find an automaton block to update.";
    }
  }

  if (action.action === "resize_array") {
    const array = getTargetArray(nextDocument, action.componentId, nextSlideId);
    if (array) {
      const nextLength = Math.max(0, Math.min(12, Math.round(action.length)));
      const currentValues = array.props.values.map((item) => item.value);
      array.props.values = normalizeArrayValues(
        Array.from({ length: nextLength }, (_, index) => currentValues[index] ?? `${index}`)
      );
      message = `Resized ${array.props.title} to ${nextLength} elements.`;
    } else {
      message = "Could not find an array block to resize.";
    }
  }

  if (action.action === "highlight_array_index") {
    const array = getTargetArray(nextDocument, action.componentId, nextSlideId);
    if (array) {
      array.props.highlightedIndex = action.index;
      message =
        typeof action.index === "number"
          ? `Highlighted index ${action.index} on ${array.props.title}.`
          : `Cleared the highlight on ${array.props.title}.`;
    } else {
      message = "Could not find an array block to highlight.";
    }
  }

  if (action.action === "append_array_value") {
    const array = getTargetArray(nextDocument, action.componentId, nextSlideId);
    if (array) {
      const nextValue = (action.value ?? "").trim();
      const fallback = String(array.props.values.length);
      const value = nextValue || fallback;
      const nextValues = [...array.props.values, { value }];
      if (nextValues.length > 12) {
        message = `${array.props.title} is at the 12-element cap; can't append.`;
      } else {
        array.props.values = nextValues;
        message = `Appended ${value} to ${array.props.title}.`;
      }
    } else {
      message = "Could not find an array block to append to.";
    }
  }

  if (action.action === "pop_array_value") {
    const array = getTargetArray(nextDocument, action.componentId, nextSlideId);
    if (array) {
      if (array.props.values.length === 0) {
        message = `${array.props.title} is already empty.`;
      } else {
        const popped = array.props.values[array.props.values.length - 1].value;
        array.props.values = array.props.values.slice(0, -1);
        if (
          typeof array.props.highlightedIndex === "number" &&
          array.props.highlightedIndex >= array.props.values.length
        ) {
          array.props.highlightedIndex = undefined;
        }
        message = `Popped ${popped} from ${array.props.title}.`;
      }
    } else {
      message = "Could not find an array block to pop from.";
    }
  }

  if (action.action === "duplicate_array_block") {
    const source = getTargetArray(nextDocument, action.componentId, nextSlideId);
    if (source) {
      const duplicate = cloneItemWithNewIds(source) as ArrayItem;
      duplicate.props.title = action.title?.trim() || `${source.props.title} copy`;
      duplicate.props.highlightedIndex = undefined;
      if (action.appendValue !== undefined) {
        const value = String(action.appendValue).trim() ||
          String(duplicate.props.values.length);
        duplicate.props.values = [...duplicate.props.values, { value }];
      }
      const result = pushIntoActiveSlide(nextDocument, nextSlideId, duplicate);
      nextSlideId = result.slideId;
      message = result.inserted
        ? `Duplicated ${source.props.title} as ${duplicate.props.title}.`
        : FRAME_CONTENT_LIMIT_MESSAGE;
    } else {
      message = "Could not find an array block to duplicate.";
    }
  }

  if (action.action === "add_stack_block") {
    const isFixed = Boolean(action.isFixed);
    const stackSize = action.stackSize ?? DEFAULT_STACK_SIZE;
    const result = pushIntoActiveSlide(nextDocument, nextSlideId, {
      type: "StackBlock",
      props: {
        id: createCanvasId("stack"),
        title: action.title?.trim() || "Stack A",
        values: normalizeArrayValues(
          clampStackToCapacity(
            action.values?.length ? action.values : ["8", "5", "0"],
            isFixed ? { isFixed: true, size: stackSize } : { isFixed: false },
          ),
        ),
        highlightedIndex: undefined,
        caption: isFixed
          ? `Fixed stack, capacity ${stackSize}. Push adds to the top; pop removes from the top.`
          : "Push adds to the top; pop removes from the top.",
        isFixed,
        stackSize: isFixed ? stackSize : undefined,
      },
    });
    nextSlideId = result.slideId;
    message = result.inserted ? "Added a stack block to the active frame." : FRAME_CONTENT_LIMIT_MESSAGE;
  }

  if (action.action === "push_stack_value") {
    const stack = getTargetStack(nextDocument, action.componentId, nextSlideId);
    if (stack) {
      const capacity = stackCapacityOf(stack);
      const currentValues = stack.props.values.map((item) => item.value);
      if (!canPushStack(currentValues.length, capacity)) {
        message = `${stack.props.title} is full (capacity ${capacity.isFixed ? capacity.size : "∞"}); pop before pushing.`;
      } else {
        const value = (action.value ?? "").trim() || String(currentValues.length);
        stack.props.values = normalizeArrayValues(
          pushStack(currentValues, value, capacity),
        );
        message = `Pushed ${value} onto ${stack.props.title}.`;
      }
    } else {
      message = "Could not find a stack block to push onto.";
    }
  }

  if (action.action === "pop_stack_value") {
    const stack = getTargetStack(nextDocument, action.componentId, nextSlideId);
    if (stack) {
      const currentValues = stack.props.values.map((item) => item.value);
      if (currentValues.length === 0) {
        message = `${stack.props.title} is already empty.`;
      } else {
        const popped = currentValues[currentValues.length - 1];
        stack.props.values = normalizeArrayValues(popStack(currentValues));
        if (
          typeof stack.props.highlightedIndex === "number" &&
          stack.props.highlightedIndex >= stack.props.values.length
        ) {
          stack.props.highlightedIndex = undefined;
        }
        message = `Popped ${popped} from ${stack.props.title}.`;
      }
    } else {
      message = "Could not find a stack block to pop from.";
    }
  }

  if (action.action === "add_queue_block") {
    const result = pushIntoActiveSlide(nextDocument, nextSlideId, {
      type: "QueueBlock",
      props: {
        id: createCanvasId("queue"),
        title: action.title?.trim() || "Queue A",
        values: normalizeArrayValues(action.values?.length ? action.values : ["8", "5", "0"]),
        highlightedIndex: undefined,
        caption: "Enqueue adds to the back; dequeue removes from the front.",
      },
    });
    nextSlideId = result.slideId;
    message = result.inserted ? "Added a queue block to the active frame." : FRAME_CONTENT_LIMIT_MESSAGE;
  }

  if (action.action === "add_linked_list_block") {
    const result = pushIntoActiveSlide(nextDocument, nextSlideId, {
      type: "LinkedListBlock",
      props: {
        id: createCanvasId("list"),
        title: "Linked list",
        nodes: normalizeArrayValues(action.values?.length ? action.values : ["head", "node", "tail"]),
        caption: "Each node stores a value and a pointer to the next node.",
      },
    });
    nextSlideId = result.slideId;
    message = result.inserted ? "Added a linked list block to the active frame." : FRAME_CONTENT_LIMIT_MESSAGE;
  }

  if (action.action === "add_checkpoint") {
    const result = pushIntoActiveSlide(nextDocument, nextSlideId, {
      type: "CheckpointBlock",
      props: {
        id: createCanvasId("checkpoint"),
        question: action.question?.trim() || "What should students answer here?",
        answer: action.answer?.trim() || "Add the expected answer.",
      },
    });
    nextSlideId = result.slideId;
    message = result.inserted ? "Added a checkpoint block to the active frame." : FRAME_CONTENT_LIMIT_MESSAGE;
  }

  return {
    document: normalizeCanvasFrames(nextDocument),
    activeSlideId: nextSlideId,
    message,
  };
}
