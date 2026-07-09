import type {
  ArrayBlockProps,
  CanvasAiAction,
  CanvasCommandResult,
  CanvasDocument,
  SlideBlockProps,
} from "@/features/canvas/types/canvas-types";
import { createCanvasId } from "@/features/canvas/lib/canvas-templates";

type CanvasItem = CanvasDocument["content"][number];
type SlideItem = CanvasItem & {
  type: "SlideBlock";
  props: SlideBlockProps & { id: string; content: CanvasItem[] };
};
type ArrayItem = CanvasItem & { type: "ArrayBlock"; props: ArrayBlockProps & { id: string } };

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

function getSlides(document: CanvasDocument) {
  return document.content.filter(isSlideItem);
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

function getTargetArray(document: CanvasDocument, componentId?: string) {
  for (const slide of getSlides(document)) {
    const array = getSlideContent(slide).find((item): item is ArrayItem => {
      return isArrayItem(item) && (!componentId || item.props.id === componentId);
    });

    if (array) {
      return array;
    }
  }

  return null;
}

function getArrays(document: CanvasDocument) {
  return getSlides(document).flatMap((slide) => getSlideContent(slide).filter(isArrayItem));
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

function pushIntoActiveSlide(
  document: CanvasDocument,
  activeSlideId: string | null,
  item: CanvasItem
) {
  let slide = getActiveSlide(document, activeSlideId);

  if (!slide) {
    slide = {
      type: "SlideBlock",
      props: {
        id: createCanvasId("slide"),
        frameLabel: "Frame 1",
        title: "Frame 1",
        teachingBeat: "hook",
        notes: "Set the context for the class.",
        content: [],
      },
    };
    document.content.push(slide);
  }

  slide.props.content = [...getSlideContent(slide), item];

  return slide.props.id;
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
        notes: action.notes?.trim() || "Add teaching notes for this frame.",
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
        notes: action.notes?.trim() || "Add teaching notes for this frame.",
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
    nextSlideId = pushIntoActiveSlide(
      nextDocument,
      nextSlideId,
      createHeadingTextItem(action.heading?.trim() || action.body?.trim() || "New heading")
    );
    message = "Added a heading block to the active frame.";
  }

  if (action.action === "add_array_block") {
    nextSlideId = pushIntoActiveSlide(nextDocument, nextSlideId, {
      type: "ArrayBlock",
      props: {
        id: createCanvasId("array"),
        title: action.title?.trim() || "Array A",
        values: normalizeArrayValues(action.values?.length ? action.values : ["8", "5", "0", "1"]),
        highlightedIndex: 0,
        showIndices: true,
        caption: "Use voice or the fields panel to change this array during class.",
      },
    });
    message = "Added an editable array block to the active frame.";
  }

  if (action.action === "set_array_values") {
    const array = getTargetArray(nextDocument, action.componentId);
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

  if (action.action === "resize_array") {
    const array = getTargetArray(nextDocument, action.componentId);
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
    const array = getTargetArray(nextDocument, action.componentId);
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

  if (action.action === "add_stack_block") {
    nextSlideId = pushIntoActiveSlide(nextDocument, nextSlideId, {
      type: "StackBlock",
      props: {
        id: createCanvasId("stack"),
        title: action.title?.trim() || "Stack A",
        values: normalizeArrayValues(action.values?.length ? action.values : ["8", "5", "0"]),
        highlightedIndex: undefined,
        caption: "Push adds to the top; pop removes from the top.",
      },
    });
    message = "Added a stack block to the active frame.";
  }

  if (action.action === "add_queue_block") {
    nextSlideId = pushIntoActiveSlide(nextDocument, nextSlideId, {
      type: "QueueBlock",
      props: {
        id: createCanvasId("queue"),
        title: action.title?.trim() || "Queue A",
        values: normalizeArrayValues(action.values?.length ? action.values : ["8", "5", "0"]),
        highlightedIndex: undefined,
        caption: "Enqueue adds to the back; dequeue removes from the front.",
      },
    });
    message = "Added a queue block to the active frame.";
  }

  if (action.action === "add_linked_list_block") {
    nextSlideId = pushIntoActiveSlide(nextDocument, nextSlideId, {
      type: "LinkedListBlock",
      props: {
        id: createCanvasId("list"),
        title: "Linked list",
        nodes: normalizeArrayValues(action.values?.length ? action.values : ["head", "node", "tail"]),
        caption: "Each node stores a value and a pointer to the next node.",
      },
    });
    message = "Added a linked list block to the active frame.";
  }

  if (action.action === "add_checkpoint") {
    nextSlideId = pushIntoActiveSlide(nextDocument, nextSlideId, {
      type: "CheckpointBlock",
      props: {
        id: createCanvasId("checkpoint"),
        question: action.question?.trim() || "What should students answer here?",
        answer: action.answer?.trim() || "Add the expected answer.",
      },
    });
    message = "Added a checkpoint block to the active frame.";
  }

  return {
    document: normalizeCanvasFrames(nextDocument),
    activeSlideId: nextSlideId,
    message,
  };
}
