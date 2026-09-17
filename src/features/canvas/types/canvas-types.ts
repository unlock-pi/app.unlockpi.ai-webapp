import type { Data, Slot } from "@puckeditor/core";

// TODO: Consider adding more subjects in the future, such as "mathematics", "physics", etc. For now, we only have "computer_science".
// FIX: The subject is currently hardcoded to "computer_science" in the CanvasRootProps. We should consider making this dynamic or configurable in the future to support multiple subjects.
// IMPLEMENTATION NOTE: The CanvasSubject type is currently limited to "computer_science". If we want to support more subjects in the future, we can extend this type and update the CanvasRootProps accordingly.
export type CanvasSubject = "computer_science";

export type CanvasThemeId =
  | "default"
  | "default-light"
  | "studio"
  | "notebook"
  | "chalkboard"
  | "blueprint";

export type CanvasTypographyScale = "base" | "medium" | "small";

/**
 * Canvas text typeface — separate axis from `CanvasTypographyScale` (which
 * only controls size). "modern" is the existing default (Inter/Manrope/Space
 * Grotesk, already loaded globally). "handwriting", "old-school", and
 * "chalkboard" are per-canvas opt-ins whose fonts are only fetched when
 * actually selected — see the @font-face comments in globals.css.
 *
 * "chalkboard" here is a TYPEFACE (chalk-board-regular.woff2) — unrelated to
 * the "chalkboard" `CanvasThemeId` color theme above, which is a different
 * axis (colors, not font) and is currently disabled in canvasThemeOptions.
 */
export type CanvasFontFamily =
  | "modern"
  | "handwriting"
  | "old-school"
  | "chalkboard";

export type CanvasRootProps = {
  title: string;
  subject: CanvasSubject;
  theme: CanvasThemeId;
  typographyScale: CanvasTypographyScale;
  fontFamily: CanvasFontFamily;
};

export type SlideBlockProps = {
  frameLabel?: string;
  title: string;
  teachingBeat: "hook" | "explain" | "practice" | "recap";
  content: Slot;
};

export type HeadingTextBlockProps = {
  // The heading text is the main title or heading for a section of content. It should be concise and descriptive, providing a clear indication of the topic or subject matter being addressed in the following content.
  // TODO: Consider adding support for different heading levels (e.g., h1, h2, h3) in the future to allow for more flexible content structuring. For now, we only have a single heading level.
  // FIX: The heading text is currently limited to a single string in the HeadingTextBlockProps. We should consider allowing for more complex heading structures (e.g., multiple lines, formatting) in the future.
  text: string;
};

export type SubheadingTextBlockProps = {
  // The subheading text is a secondary heading that provides additional context or clarification for the main heading. It should be concise and informative, helping to guide the reader's understanding of the content that follows.
  // TODO: Consider adding support for different subheading levels (e.g., h4, h5) in the future to allow for more flexible content structuring. For now, we only have a single subheading level.
  // FIX: The subheading text is currently limited to a single string in the SubheadingTextBlockProps. We should consider allowing for more complex subheading structures (e.g., multiple lines, formatting) in the future.
  text: string;
};

export type BodyTextBlockProps = {
  text: string;
};

export type ArrayBlockProps = {
  title: string;
  values: Array<{ value: string }>;
  highlightedIndex?: number;
  visitedIndices?: number[];
  traversalTarget?: number;
  showIndices: boolean;
  caption: string;
};

export type StackBlockProps = {
  title: string;
  values: Array<{ value: string }>;
  highlightedIndex?: number;
  visitedIndices?: number[];
  traversalTarget?: number;
  caption: string;
  /**
   * When true, push/pop (from voice or the fields panel) enforce `stackSize`
   * as a hard capacity via the shared rules in
   * `src/components/data-structure/stack-model.ts` — a push beyond capacity
   * is a no-op with an explanatory message, not a silent overflow.
   */
  isFixed?: boolean;
  /** Only used when `isFixed`. Defaults to 5 — see stack-model.ts's default. */
  stackSize?: number;
};

export type QueueBlockProps = {
  title: string;
  values: Array<{ value: string }>;
  highlightedIndex?: number;
  visitedIndices?: number[];
  traversalTarget?: number;
  caption: string;
};

export type LinkedListBlockProps = {
  title: string;
  nodes: Array<{ value: string }>;
  highlightedIndex?: number;
  visitedIndices?: number[];
  traversalTarget?: number;
  caption: string;
};

export type MindMapBlockProps = {
  title: string;
  center: string;
  branches: Array<{ label: string; detail: string }>;
};

export type CodeLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "cpp"
  | "c"
  | "go"
  | "rust"
  | "sql"
  | "html"
  | "css"
  | "json"
  | "markdown"
  | "plaintext";

export type CodeBlockProps = {
  title: string;
  language: CodeLanguage;
  code: string;
  explanation: string;
};

export type MermaidBlockProps = {
  chart: string;
  description?: string;
};

export type TableBlockProps = {
  title: string;
  columns: Array<{ label: string }>;
  rows: Array<{ cells: string }>;
  caption: string;
};

export type CheckpointBlockProps = {
  question: string;
  answer: string;
};

/** Scratchpad scene kept in the Draw tool panel, never stored on a block. */
export type SketchSceneData = {
  elements: readonly unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
};

/** A drawing exported from the Draw panel and dropped onto the canvas. */
export type SketchPayload = {
  src: string;
  aspectRatio: number;
  widthPercent: number;
};

export type SketchBlockProps = {
  /** Rendered width as a percentage of the frame column. */
  widthPercent: number;
  /** Not shown on the board — description the AI tutor uses to understand the drawing. */
  aiContext: string;
  src?: string;
  aspectRatio?: number;
};

export type CanvasComponents = {
  SlideBlock: SlideBlockProps;
  HeadingTextBlock: HeadingTextBlockProps;
  SubheadingTextBlock: SubheadingTextBlockProps;
  BodyTextBlock: BodyTextBlockProps;
  ArrayBlock: ArrayBlockProps;
  StackBlock: StackBlockProps;
  QueueBlock: QueueBlockProps;
  LinkedListBlock: LinkedListBlockProps;
  MindMapBlock: MindMapBlockProps;
  CodeBlock: CodeBlockProps;
  MermaidBlock: MermaidBlockProps;
  TableBlock: TableBlockProps;
  CheckpointBlock: CheckpointBlockProps;
  SketchBlock: SketchBlockProps;
};

export type CanvasDocument = Data<CanvasComponents, CanvasRootProps>;

export type CanvasTemplateKey =
  | "array-intro"
  | "array-operations"
  | "linked-list-basics"
  | "complexity-basics"
  | "recursion-basics"
  | "empty";

export type CanvasTemplate = {
  key: CanvasTemplateKey;
  title: string;
  description: string;
  image: string;
  document: CanvasDocument;
};

export type CanvasAiAction =
  | { action: "add_slide"; title?: string; notes?: string }
  | { action: "add_frame"; title?: string; notes?: string }
  | {
    action: "add_frame_below";
    frameId?: string;
    title?: string;
    notes?: string;
  }
  | { action: "duplicate_frame"; frameId?: string }
  | { action: "delete_frame"; frameId?: string }
  | { action: "go_to_slide"; slideIndex?: number; slideId?: string }
  | { action: "go_to_frame"; frameIndex?: number; frameId?: string }
  | { action: "update_slide_title"; slideId?: string; title: string }
  | { action: "update_frame_title"; frameId?: string; title: string }
  | { action: "add_text_block"; heading?: string; body?: string }
  | { action: "add_array_block"; title?: string; values?: string[] }
  | { action: "set_array_values"; componentId?: string; values: string[] }
  | { action: "resize_array"; componentId?: string; length: number }
  | { action: "highlight_array_index"; componentId?: string; index?: number }
  | { action: "append_array_value"; componentId?: string; value?: string }
  | { action: "pop_array_value"; componentId?: string }
  | { action: "duplicate_array_block"; componentId?: string; title?: string; appendValue?: string }
  | {
    action: "add_stack_block";
    title?: string;
    values?: string[];
    isFixed?: boolean;
    stackSize?: number;
  }
  | { action: "push_stack_value"; componentId?: string; value?: string }
  | { action: "pop_stack_value"; componentId?: string }
  | { action: "add_queue_block"; title?: string; values?: string[] }
  | { action: "add_linked_list_block"; values?: string[] }
  | { action: "add_checkpoint"; question?: string; answer?: string };

export type CanvasCommandResult = {
  document: CanvasDocument;
  activeSlideId: string | null;
  message: string;
};
