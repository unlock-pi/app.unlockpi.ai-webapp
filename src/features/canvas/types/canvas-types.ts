import type { Data, Slot } from "@puckeditor/core";

export type CanvasSubject = "computer_science";

export type CanvasThemeId =
  | "default"
  | "studio"
  | "notebook"
  | "chalkboard"
  | "blueprint";

export type CanvasTypographyScale = "base" | "medium" | "small";

export type CanvasRootProps = {
  title: string;
  subject: CanvasSubject;
  theme: CanvasThemeId;
  typographyScale: CanvasTypographyScale;
};

export type SlideBlockProps = {
  frameLabel?: string;
  title: string;
  teachingBeat: "hook" | "explain" | "practice" | "recap";
  notes: string;
  content: Slot;
};

export type HeadingTextBlockProps = {
  text: string;
};

export type SubheadingTextBlockProps = {
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
  title: string;
  caption: string;
  /** Rendered width as a percentage of the frame column. */
  widthPercent: number;
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
  | { action: "add_stack_block"; title?: string; values?: string[] }
  | { action: "add_queue_block"; title?: string; values?: string[] }
  | { action: "add_linked_list_block"; values?: string[] }
  | { action: "add_checkpoint"; question?: string; answer?: string };

export type CanvasCommandResult = {
  document: CanvasDocument;
  activeSlideId: string | null;
  message: string;
};
