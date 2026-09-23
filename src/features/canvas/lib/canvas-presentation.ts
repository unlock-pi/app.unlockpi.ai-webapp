import { arrayNameFromTitle } from "@/features/arrays-agent/lib/array-name";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";

/**
 * Every mode a class can be presented in, in one place.
 *
 * The mode list used to be restated in three places — the union type, the
 * editor's start-class buttons, and the `?present=` URL guard — so adding one
 * meant finding all three. Deriving them from this array means a new mode is
 * added once.
 */
export const CANVAS_PRESENTATION_MODES = [
  "manual",
  "voice",
  "companion",
  "arrays",
  "stacks",
] as const;

export type CanvasPresentationMode = (typeof CANVAS_PRESENTATION_MODES)[number];

export function isCanvasPresentationMode(
  value: string | null,
): value is CanvasPresentationMode {
  return (CANVAS_PRESENTATION_MODES as readonly string[]).includes(value ?? "");
}

export type CanvasPresentationFrame = {
  document: CanvasDocument;
  id: string;
  index: number;
  searchText: string;
  title: string;
};

export function getCanvasPresentationFrames(
  document: CanvasDocument,
): CanvasPresentationFrame[] {
  return document.content
    .filter((item) => item.type === "SlideBlock")
    .map((item, index) => {
      const title = item.props.title || `Frame ${index + 1}`;

      return {
        document: {
          ...document,
          content: [
            {
              ...item,
              props: {
                ...item.props,
                frameLabel: `Frame ${index + 1}`,
              },
            },
          ],
        },
        id: item.props.id,
        index,
        searchText: collectSearchText(item.props).toLowerCase(),
        title,
      };
    });
}

export function describePresentationFrames(document: CanvasDocument) {
  return getCanvasPresentationFrames(document).map((frame) => ({
    frame_number: frame.index + 1,
    title: frame.title,
    searchable_content: frame.searchText.slice(0, 1200),
  }));
}

/**
 * The visual block types present on a frame (e.g. ["Heading", "Array", "Code"]).
 * This is what lets the model reason about *what kind* of content is on screen,
 * not just its text — so it knows an array is there to highlight, a diagram to
 * point at, etc.
 */
export function getFrameBlockTypes(frame: CanvasPresentationFrame): string[] {
  const slide = frame.document.content[0] as
    | { props?: { content?: Array<{ type?: string }> } }
    | undefined;
  const children = slide?.props?.content ?? [];
  return children
    .map((child) => String(child.type ?? "").replace(/Block$/, ""))
    .filter(Boolean);
}

/**
 * The frame's teaching beat — hook / explain / practice / recap. This is the
 * teacher's own declaration of what this frame is FOR, and it's the signal
 * that lets the AI change behaviour per frame rather than narrating
 * everything in the same register: ask a question on a practice frame,
 * summarise on a recap, stay out of the way on a hook.
 */
export function getFrameTeachingBeat(
  frame: CanvasPresentationFrame,
): string | undefined {
  const slide = frame.document.content[0] as
    | { props?: { teachingBeat?: string } }
    | undefined;
  return slide?.props?.teachingBeat;
}

/**
 * Compact ground-truth description of a single frame, sent to the model every
 * time the visible frame changes (manual or AI nav). This is the "sight" — it
 * keeps the model's idea of "where are we and what's here" from going stale.
 */
export function describeFrameForModel(
  frame: CanvasPresentationFrame,
  totalFrames: number,
): string {
  return JSON.stringify({
    now_showing: {
      frame_number: frame.index + 1,
      total_frames: totalFrames,
      title: frame.title,
      teaching_beat: getFrameTeachingBeat(frame),
      block_types: getFrameBlockTypes(frame),
      content: frame.searchText.slice(0, 800),
    },
  });
}

type AnyBlock = { type?: string; props?: Record<string, unknown> };

/**
 * Read every block on a frame as structured data.
 *
 * `describeFrameForModel` flattens a frame into one text blob, which is fine
 * for matching but useless for explaining — the model cannot tell a heading
 * from a caption, or see an array's values in order. This keeps the shape, so
 * the agent can actually say what is on screen and in what role.
 */
export function readFrameBlocks(frame: CanvasPresentationFrame) {
  const slide = frame.document.content[0] as
    | { props?: { content?: AnyBlock[]; teachingBeat?: string } }
    | undefined;

  return (slide?.props?.content ?? []).map((block) => {
    const props = (block.props ?? {}) as Record<string, unknown>;
    const kind = String(block.type ?? "").replace(/Block$/, "");
    const id = typeof props.id === "string" ? props.id : undefined;

    const text = (key: string) =>
      typeof props[key] === "string" && (props[key] as string).trim()
        ? (props[key] as string)
        : undefined;

    const values = Array.isArray(props.values)
      ? (props.values as Array<{ value?: unknown }>).map((entry) =>
          String(entry?.value ?? ""),
        )
      : undefined;

    const nodes = Array.isArray(props.nodes)
      ? (props.nodes as Array<{ value?: unknown }>).map((entry) =>
          String(entry?.value ?? ""),
        )
      : undefined;

    return {
      id,
      kind,
      title: text("title"),
      text: text("text"),
      caption: text("caption"),
      code: text("code"),
      language: text("language"),
      explanation: text("explanation"),
      question: text("question"),
      answer: text("answer"),
      chart: text("chart"),
      // A drawing the model cannot see — the teacher's own description is the
      // only thing it can honestly talk about.
      drawingDescription: text("aiContext"),
      values: values ?? nodes,
      highlightedIndex:
        typeof props.highlightedIndex === "number" ? props.highlightedIndex : undefined,
    };
  });
}

/** Everything the agent needs to explain the frame the class is looking at. */
export function describeFrameContents(
  frame: CanvasPresentationFrame,
  totalFrames: number,
) {
  return JSON.stringify({
    frame_number: frame.index + 1,
    total_frames: totalFrames,
    title: frame.title,
    teaching_beat: getFrameTeachingBeat(frame),
    blocks: readFrameBlocks(frame),
  });
}

const BLOCK_NAMES: Record<string, string> = {
  HeadingText: "heading",
  SubheadingText: "subheading",
  BodyText: "paragraph",
  Array: "array",
  Stack: "stack",
  Queue: "queue",
  LinkedList: "linked list",
  Code: "code",
  Table: "table",
  Mermaid: "diagram",
  Checkpoint: "question",
  MindMap: "mind map",
  Sketch: "drawing",
};

function clip(text: string, max: number) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * The frame as a short numbered list a person could read aloud.
 *
 * This is what the voice agent receives, instead of `describeFrameContents`'
 * JSON. The JSON carried every block id and field name — roughly twice the
 * size for a typical frame — and in a realtime session every token of it
 * stays in the context window, pushing out the conversation.
 *
 * Text is kept nearly whole: the agent is asked to explain frames, and a
 * paragraph cut short is a paragraph it cannot explain. Frame capacity
 * already bounds how much text one frame can hold.
 */
export function describeFrameReadable(
  frame: CanvasPresentationFrame,
  totalFrames: number,
): string {
  const beat = getFrameTeachingBeat(frame);
  const lines = readFrameBlocks(frame).map((block, index) => {
    const name = BLOCK_NAMES[block.kind] ?? block.kind.toLowerCase();
    const position = `${index + 1}. ${name}`;

    switch (block.kind) {
      case "HeadingText":
      case "SubheadingText":
      case "BodyText":
        return `${position}: "${clip(block.text ?? "", 600)}"`;
      case "Array":
        return `${position} ${arrayNameFromTitle(block.title)} = [${(block.values ?? []).join(", ")}] (${block.values?.length ?? 0} elements)`;
      case "Stack":
      case "Queue":
      case "LinkedList":
        return `${position} = [${(block.values ?? []).join(", ")}] (${block.values?.length ?? 0} elements)`;
      case "Code": {
        const code = (block.code ?? "").split("\n").slice(0, 6).join(" ⏎ ");
        return `${position} (${block.language ?? "code"}): ${clip(code, 240)}${block.explanation ? ` — ${clip(block.explanation, 120)}` : ""}`;
      }
      case "Checkpoint":
        return `${position}: "${clip(block.question ?? "", 200)}" (answer: "${clip(block.answer ?? "", 120)}")`;
      case "Sketch":
        return `${position}: ${block.drawingDescription ? `"${clip(block.drawingDescription, 200)}"` : "no description"}`;
      default:
        return `${position}${block.title ? `: "${clip(block.title, 120)}"` : ""}`;
    }
  });

  return [
    `Frame ${frame.index + 1} of ${totalFrames}: "${frame.title}"${beat ? ` (beat: ${beat})` : ""}`,
    lines.length ? lines.join("\n") : "(this frame is empty)",
  ].join("\n");
}

function collectSearchText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(collectSearchText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      // `src` is a base64 image data URI (SketchBlock) — including it here
      // would flood the model's truncated context budget with junk and push
      // out the actually-useful text, e.g. the drawing's aiContext.
      .filter(([key]) => key !== "id" && key !== "src")
      .map(([, child]) => collectSearchText(child))
      .join(" ");
  }

  return "";
}
