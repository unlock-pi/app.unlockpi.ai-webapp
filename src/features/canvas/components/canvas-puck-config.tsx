"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { DropZone, type Config, type SlotComponent } from "@puckeditor/core";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  CopyIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerHeader,
  DrawerMenu,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Logo from "@/components/logo";
import { ArrayStrip } from "@/components/data-structure/array-strip";
import { LinkedListStrip } from "@/components/data-structure/linked-list-strip";
import { MindMapBoard } from "@/components/data-structure/mind-map-board";
import { QueueStrip } from "@/components/data-structure/queue-strip";
import { StackStrip } from "@/components/data-structure/stack-strip";

import { MermaidDiagram } from "@/features/talk/components/renderers/mermaid-diagram";
import { useArraysAgentView } from "@/features/arrays-agent/components/arrays-agent-view-context";
import { stackNameFromTitle } from "@/features/arrays-agent/lib/array-name";
import { TraversalTrigger } from "@/features/canvas/components/traversal-trigger";
import { useTraversalState } from "@/features/canvas/hooks/use-traversal-state";
import { SketchBlock } from "@/features/canvas/components/sketch-block";
import {
  DEFAULT_SKETCH_WIDTH_PERCENT,
  sketchWidthOptions,
} from "@/features/canvas/lib/sketch-sizes";
import { readPendingSketch } from "@/features/canvas/lib/sketch-transfer";
import type {
  ArrayBlockProps,
  BodyTextBlockProps,
  CanvasComponents,
  CanvasRootProps,
  CheckpointBlockProps,
  CodeLanguage,
  CodeBlockProps,
  HeadingTextBlockProps,
  LinkedListBlockProps,
  MermaidBlockProps,
  MindMapBlockProps,
  QueueBlockProps,
  SlideBlockProps,
  StackBlockProps,
  SubheadingTextBlockProps,
  TableBlockProps,
} from "@/features/canvas/types/canvas-types";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CANVAS_FONT_FAMILY,
  DEFAULT_CANVAS_THEME,
  DEFAULT_CANVAS_TYPOGRAPHY_SCALE,
  canvasFontFamilyOptions,
  canvasThemeOptions,
  canvasTypographyOptions,
  getCanvasThemeStyle,
} from "@/features/canvas/lib/canvas-theme";
import { ScrollArea } from "@/components/ui/scroll-area";

const headingFontStyle = {
  fontFamily: "var(--font-canvas-heading), var(--font-system), sans-serif",
} as CSSProperties;

const subheadingFontStyle = {
  fontFamily: "var(--font-canvas-subheading), var(--font-system), sans-serif",
} as CSSProperties;

const bodyFontStyle = {
  fontFamily: "var(--font-canvas-body), var(--font-system), sans-serif",
} as CSSProperties;

const codeLanguageOptions: Array<{ label: string; value: CodeLanguage }> = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C++", value: "cpp" },
  { label: "C", value: "c" },
  { label: "Go", value: "go" },
  { label: "Rust", value: "rust" },
  { label: "SQL", value: "sql" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
  { label: "JSON", value: "json" },
  { label: "Markdown", value: "markdown" },
  { label: "Plain text", value: "plaintext" },
];

const codeLanguageLabels = Object.fromEntries(
  codeLanguageOptions.map((option) => [option.value, option.label]),
) as Record<CodeLanguage, string>;

function blockShell(className: string | undefined, children: ReactNode) {
  return (
    <section
      className={cn(
        "canvas-frame-block flex flex-col justify-start rounded-lg border border-border bg-card p-5 shadow-xs",
        className,
      )}
    >
      {children}
    </section>
  );
}

function extractBlockCopyText(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractBlockCopyText(item))
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredKeys = ["value", "text", "caption", "label", "title"];

    for (const key of preferredKeys) {
      const extracted = extractBlockCopyText(record[key]);
      if (extracted) {
        return extracted;
      }
    }

    for (const key of ["children", "content", "props", "data"]) {
      const extracted = extractBlockCopyText(record[key]);
      if (extracted) {
        return extracted;
      }
    }
  }

  return "";
}

function OptionalBlockCopy({
  id,
  title,
  caption,
}: {
  id: string;
  title?: string;
  caption?: string;
}) {
  const normalizedTitle = extractBlockCopyText(title);
  const normalizedCaption = extractBlockCopyText(caption);
  const remove = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  if (!normalizedTitle && !normalizedCaption) return null;

  return (
    <header className="canvas-optional-block-copy flex w-full flex-col gap-1 text-left">
      {normalizedTitle ? (
        <div className="group flex items-center gap-1.5">
          <h3
            className="canvas-block-copy-editor text-base font-semibold leading-5 tracking-tight text-foreground"
            contentEditable
            suppressContentEditableWarning
            data-canvas-edit-block-copy="title"
            data-canvas-block-id={id}
            data-canvas-block-title={normalizedTitle}
          >
            {normalizedTitle}
          </h3>
          <button
            type="button"
            aria-label="Remove block title"
            className="canvas-copy-delete"
            data-canvas-remove-block-copy="title"
            data-canvas-block-id={id}
            data-canvas-block-title={normalizedTitle}
            onClick={remove}
          >
            <Trash2Icon className="size-3" />
          </button>
        </div>
      ) : null}
      {normalizedCaption ? (
        <div className="group flex items-center gap-1.5">
          <p
            className="canvas-block-copy-editor text-sm leading-5 text-muted-foreground"
            contentEditable
            suppressContentEditableWarning
            data-canvas-edit-block-copy="caption"
            data-canvas-block-id={id}
            data-canvas-block-title={normalizedTitle}
          >
            {normalizedCaption}
          </p>
          <button
            type="button"
            aria-label="Remove block description"
            className="canvas-copy-delete"
            data-canvas-remove-block-copy="caption"
            data-canvas-block-id={id}
            data-canvas-block-title={normalizedTitle}
            onClick={remove}
          >
            <Trash2Icon className="size-3" />
          </button>
        </div>
      ) : null}
    </header>
  );
}

type SlideRenderProps = Omit<SlideBlockProps, "content"> & {
  id: string;
  content: SlotComponent;
};

function FrameMenuItem({
  action,
  children,
  frameId,
  className,
}: {
  action: string;
  children?: ReactNode;
  frameId: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-canvas-frame-action={action}
      data-canvas-frame-id={frameId}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground transition hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

function SlideBlock({
  id,
  frameLabel,
  title,
  content: Content,
}: SlideRenderProps) {
  const label = frameLabel ?? "Frame";

  return (
    <article
      id={`canvas-slide-${id}`}
      className="mx-auto w-full my-auto max-w-2xl scroll-mt-4"
    >
      <div className="mb-0 flex items-center justify-between gap-3 px-1 text-foreground">
        {/*
          The teaching-beat badge used to sit here. It was pure decoration —
          nothing read it — so it was noise on every single frame while
          authoring. The field itself still exists and now feeds the AI (see
          describeFrameForModel), which is what actually earns its keep.
        */}
        <div className="flex min-w-0 items-center gap-2">
          <p className="shrink-0 text-sm font-semibold">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{title}</p>
        </div>

        <Drawer position="right">
          <DrawerTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${label} actions`}
                className="rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DrawerTrigger>
          <DrawerPopup
            position="right"
            variant="inset"
            className="w-[min(22rem,100%-1rem)]"
          >
            <DrawerHeader className="gap-1">
              <DrawerTitle>{label} actions</DrawerTitle>
              <DrawerDescription>{title}</DrawerDescription>
            </DrawerHeader>
            <DrawerPanel scrollable={false} className="pt-2">
              <DrawerMenu>
                <DrawerClose
                  render={<FrameMenuItem action="add" frameId={id} />}
                >
                  <PlusIcon className="size-3.5" />
                  Add frame
                </DrawerClose>
                <DrawerClose
                  render={<FrameMenuItem action="add-below" frameId={id} />}
                >
                  <PlusIcon className="size-3.5" />
                  Add frame below
                </DrawerClose>
                <DrawerClose
                  render={<FrameMenuItem action="duplicate" frameId={id} />}
                >
                  <CopyIcon className="size-3.5" />
                  Duplicate frame
                </DrawerClose>
                <DrawerClose
                  render={
                    <FrameMenuItem
                      action="delete"
                      frameId={id}
                      className="text-destructive hover:bg-destructive/8 hover:text-destructive"
                    />
                  }
                >
                  <Trash2Icon className="size-3.5" />
                  Delete frame
                </DrawerClose>
              </DrawerMenu>
            </DrawerPanel>
          </DrawerPopup>
        </Drawer>
      </div>
      <section
        aria-label={`${label}: ${title}`}
        title={`${label}: ${title}`}
        className="relative flex min-h-[560px] min-w-0 w-full flex-col gap-5 rounded-lg border border-border bg-background p-4 text-foreground shadow-[0_22px_70px_var(--canvas-shadow-color)] sm:p-5 lg:p-7"
      >
        <ScrollArea fill className="min-h-0 flex-1 rounded-md border">
          <Content
            allow={[
              "HeadingTextBlock",
              "SubheadingTextBlock",
              "BodyTextBlock",
              "ArrayBlock",
              "StackBlock",
              "QueueBlock",
              "LinkedListBlock",
              "MindMapBlock",
              "CodeBlock",
              "MermaidBlock",
              "TableBlock",
              "CheckpointBlock",
              "SketchBlock",
            ]}
            className="grid h-full min-h-[470px] min-w-0 content-between gap-4 rounded-lg border border-dashed border-border/70 bg-muted/10 p-3 pb-10 sm:p-4 sm:pb-11"
          />
        </ScrollArea>
        <div className="canvas-frame-watermark pointer-events-none absolute bottom-right-8 z-10 flex items-center gap-1.5 rounded-md bg-background/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 backdrop-blur-sm lg:bottom-9 lg:right-9">
          <span>Made with</span>
          <Logo
            isLink={false}
            width={18}
            height={18}
            className="rounded-full bg-background/70"
          />
          <span>UnlockPi</span>
        </div>
      </section>{" "}
    </article>
  );
}

function HeadingTextBlock({ text }: HeadingTextBlockProps) {
  return (
    <h1
      className="max-w-4xl text-balance font-bold leading-[0.95] tracking-[-0.04em] text-foreground [font-size:var(--canvas-heading-size)]"
      style={headingFontStyle}
    >
      {text}
    </h1>
  );
}

function SubheadingTextBlock({ text }: SubheadingTextBlockProps) {
  return (
    <h2
      className="max-w-4xl text-balance leading-tight tracking-[-0.03em] text-foreground [font-size:var(--canvas-subheading-size)]"
      style={subheadingFontStyle}
    >
      {text}
    </h2>
  );
}

function BodyTextBlock({ text }: BodyTextBlockProps) {
  return (
    <p
      className="max-w-3xl text-pretty text-muted-foreground [font-size:var(--canvas-body-size)] [line-height:var(--canvas-body-leading)]"
      style={bodyFontStyle}
    >
      {text}
    </p>
  );
}

/**
 * Just the array: no title, no caption, and never its own scroll container.
 *
 * It used to be `overflow-x-auto`, which turned a wide array into a
 * scrollbar in the middle of a presented frame. The strip now sizes its cells
 * to the block's width instead (see `.canvas-array-strip` in globals.css), so
 * ten cells fit without scrolling. Any title/caption stored on older blocks
 * is simply not drawn.
 */
function ArrayBlock({
  id,
  values,
  highlightedIndex,
  visitedIndices,
  traversalTarget,
  showIndices,
}: ArrayBlockProps & { id: string }) {
  const arrayValues = values.map((item) => item.value);
  const traversal = useTraversalState(
    highlightedIndex,
    visitedIndices,
    traversalTarget,
  );
  // While the arrays agent is driving this block, its animation beat is the
  // truth on screen; the authored props are what the block falls back to the
  // moment the agent lets go.
  const agent = useArraysAgentView(id);

  if (agent) {
    return blockShell(
      "canvas-frame-block--compact canvas-array-block",
      <div className="grid w-full gap-4">
        <ArrayStrip
          className="max-w-none justify-start"
          data={agent.view.values}
          name="A"
          showIndex={agent.showIndices}
          activeIndices={agent.view.active}
          settledIndices={agent.view.settled}
          visitedIndices={agent.view.visited}
          foundIndex={agent.view.found}
          marker={agent.view.marker}
          held={agent.view.held}
        />
        {agent.isAnimating && agent.view.note ? (
          <p className="canvas-array-step text-muted-foreground">{agent.view.note}</p>
        ) : null}
      </div>,
    );
  }

  return blockShell(
    "canvas-frame-block--compact canvas-array-block",
    <div className="grid w-full gap-4">
      <ArrayStrip
        activeIndex={traversal.highlightedIndex}
        visitedIndices={traversal.visitedIndices}
        traversalTarget={traversalTarget}
        className="max-w-none justify-start"
        data={arrayValues}
        name="A"
        showIndex={showIndices}
      />
      <TraversalTrigger
        length={arrayValues.length}
        traversalTarget={traversalTarget}
        highlightedIndex={traversal.highlightedIndex}
        visitedIndices={traversal.visitedIndices}
        onUpdate={traversal.setTraversal}
      />
    </div>,
  );
}

function StackBlock({
  id,
  title,
  values,
  highlightedIndex,
  visitedIndices,
  traversalTarget,
  caption,
  isFixed,
  stackSize,
}: StackBlockProps & { id: string }) {
  const stackValues = values.map((item) => item.value);
  const traversal = useTraversalState(
    highlightedIndex,
    visitedIndices,
    traversalTarget,
  );
  // The stacks tutor drives this block the same way the arrays tutor drives
  // an array strip: while it is playing, its beat is the truth on screen, and
  // the authored props are what the block falls back to when it lets go.
  const agent = useArraysAgentView(id);

  if (agent) {
    const top = agent.view.values.length - 1;
    return blockShell(
      "canvas-frame-block--compact",
      <div className="grid w-full gap-4">
        <StackStrip
          data={agent.view.values}
          name={stackNameFromTitle(title)}
          activeIndex={agent.view.found ?? agent.view.active[0] ?? undefined}
          visitedIndices={agent.view.visited}
          isFixed={isFixed}
          stackSize={stackSize}
          className="justify-start pt-6"
        />
        {agent.view.held ? (
          <p className="canvas-array-step text-muted-foreground">
            {agent.view.held.label}: {agent.view.held.value}
          </p>
        ) : null}
        {agent.isAnimating && agent.view.note ? (
          <p className="canvas-array-step text-muted-foreground">{agent.view.note}</p>
        ) : null}
        {!agent.isAnimating && top >= 0 ? null : null}
      </div>,
    );
  }

  return blockShell(
    !title || !caption ? "canvas-frame-block--compact" : undefined,
    <div className="grid w-full gap-4">
      <OptionalBlockCopy id={id} title={title} caption={caption} />
      <StackStrip
        activeIndex={traversal.highlightedIndex}
        visitedIndices={traversal.visitedIndices}
        traversalTarget={traversalTarget}
        data={stackValues}
        name={stackNameFromTitle(title)}
        isFixed={isFixed}
        stackSize={stackSize}
        className={cn("justify-start", (!title || !caption) && "pt-6")}
      />
      <TraversalTrigger
        length={stackValues.length}
        traversalTarget={traversalTarget}
        highlightedIndex={traversal.highlightedIndex}
        visitedIndices={traversal.visitedIndices}
        onUpdate={traversal.setTraversal}
      />
    </div>,
  );
}

function QueueBlock({
  id,
  title,
  values,
  highlightedIndex,
  visitedIndices,
  traversalTarget,
  caption,
}: QueueBlockProps & { id: string }) {
  const queueValues = values.map((item) => item.value);
  const traversal = useTraversalState(
    highlightedIndex,
    visitedIndices,
    traversalTarget,
  );

  return blockShell(
    cn("overflow-x-auto", (!title || !caption) && "canvas-frame-block--compact"),
    <div className="grid w-full gap-4">
      <OptionalBlockCopy id={id} title={title} caption={caption} />
      <QueueStrip
        activeIndex={traversal.highlightedIndex}
        visitedIndices={traversal.visitedIndices}
        traversalTarget={traversalTarget}
        data={queueValues}
        name="Q"
        className="justify-start"
      />
      <TraversalTrigger
        length={queueValues.length}
        traversalTarget={traversalTarget}
        highlightedIndex={traversal.highlightedIndex}
        visitedIndices={traversal.visitedIndices}
        onUpdate={traversal.setTraversal}
      />
    </div>,
  );
}

function LinkedListBlock({
  id,
  title,
  nodes,
  highlightedIndex,
  visitedIndices,
  traversalTarget,
  caption,
}: LinkedListBlockProps & { id: string }) {
  const traversal = useTraversalState(
    highlightedIndex,
    visitedIndices,
    traversalTarget,
  );

  return blockShell(
    cn("overflow-x-auto", (!title || !caption) && "canvas-frame-block--compact"),
    <div className="grid w-full gap-4">
      <OptionalBlockCopy id={id} title={title} caption={caption} />
      <LinkedListStrip
        nodes={nodes}
        activeIndex={traversal.highlightedIndex}
        visitedIndices={traversal.visitedIndices}
        traversalTarget={traversalTarget}
        className="w-full"
      />
      <TraversalTrigger
        length={nodes.length}
        traversalTarget={traversalTarget}
        highlightedIndex={traversal.highlightedIndex}
        visitedIndices={traversal.visitedIndices}
        onUpdate={traversal.setTraversal}
      />
    </div>,
  );
}

function MindMapBlock({ title, center, branches }: MindMapBlockProps) {
  return blockShell(
    undefined,
    <div className="grid w-full gap-4">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <MindMapBoard center={center} branches={branches} />
    </div>,
  );
}

function CodeBlock({ title, language, code, explanation }: CodeBlockProps) {
  return blockShell(
    "grid gap-3",
    <>
      <div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{explanation}</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          <span>{codeLanguageLabels[language] ?? language}</span>
          <span>Preview</span>
        </div>
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          showLineNumbers
          wrapLongLines
          customStyle={{
            background: "transparent",
            margin: 0,
            padding: "1rem 0",
          }}
          codeTagProps={{
            style: {
              fontFamily:
                "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              fontSize: "0.875rem",
              lineHeight: 1.7,
            },
          }}
          lineNumberStyle={{
            color: "#71717a",
            minWidth: "2.5rem",
            paddingRight: "0.75rem",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </>,
  );
}

function MermaidBlock({ chart, description }: MermaidBlockProps) {
  return (
    <section
      aria-label={description || "Mermaid diagram"}
      title={description}
      className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-background/50 shadow-xs"
    >
      {/*
        Mermaid bakes font-family into the SVG at render time rather than
        inheriting ambient CSS, so it needs the canvas typeface passed
        explicitly — same var chain as headingFontStyle/bodyFontStyle above,
        which is what makes it follow Modern/Handwriting/Old school too.
      */}
      <MermaidDiagram
        chart={chart}
        fontFamily="var(--font-canvas-body), var(--font-system), sans-serif"
      />
    </section>
  );
}

function TableBlock({ title, columns, rows, caption }: TableBlockProps) {
  const columnLabels = columns.length
    ? columns.map((column) => column.label)
    : ["Column 1", "Column 2"];

  return blockShell(
    "overflow-hidden p-0",
    <div className="grid gap-4 p-5">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-background">
        {/*
          `font-family` is inherited, so setting it once on <table> covers
          every header and cell without touching each <th>/<td>. Same
          bodyFontStyle used by BodyTextBlock — this is what makes table
          content follow the canvas typeface (Modern/Handwriting/Old school)
          instead of staying on the app's default font regardless of choice.
        */}
        <table
          className="w-full min-w-[520px] border-collapse text-left text-sm"
          style={bodyFontStyle}
        >
          <thead className="bg-muted/60 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <tr>
              {columnLabels.map((column, index) => (
                <th
                  key={`${column}-${index}`}
                  className="border-b border-border px-4 py-3 font-semibold"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const cells = row.cells.split("|").map((cell) => cell.trim());

              return (
                <tr
                  key={`${row.cells}-${rowIndex}`}
                  className="odd:bg-muted/20"
                >
                  {columnLabels.map((_, cellIndex) => (
                    <td
                      key={`${rowIndex}-${cellIndex}`}
                      className="border-b border-border/70 px-4 py-3 text-foreground last:border-r-0"
                    >
                      {cells[cellIndex] || ""}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>,
  );
}

/**
 * Explicit-save inspector field for a drawing's AI context, instead of the
 * usual autosave-on-keystroke textarea: this text is what the voice AI reads
 * when a teacher asks it to explain the drawing, so a half-typed sentence
 * shouldn't be live in that pipeline before the teacher is done writing it.
 */
function SketchContextField({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  // Tracks the last `value` we've seen so an external change (undo/redo) can
  // reset `draft` during render, without an effect that would cause an extra
  // commit and risk clobbering an in-progress, unsaved edit on re-render.
  const [lastSeenValue, setLastSeenValue] = useState(value);
  if (value !== lastSeenValue) {
    setLastSeenValue(value);
    setDraft(value);
  }
  const isDirty = draft !== value;

  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold text-foreground">
        Image context for AI
      </p>
      <Textarea
        aria-label="Image context for AI"
        value={draft}
        disabled={readOnly}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Describe what this drawing shows, so the AI tutor understands it."
        className="min-h-28"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={readOnly || !isDirty}
        onClick={() => onChange(draft)}
        className="justify-self-start"
      >
        <SaveIcon className="size-3.5" />
        {isDirty ? "Save" : "Saved"}
      </Button>
    </div>
  );
}

function CheckpointBlock({ question, answer }: CheckpointBlockProps) {
  return blockShell(
    "border-success/30 bg-success/5",
    <div className="grid gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-success">
        Checkpoint
      </p>
      <h3 className="text-lg font-semibold tracking-tight">{question}</h3>
      <p className="rounded-lg border border-success/20 bg-background/72 p-3 text-sm text-muted-foreground">
        {answer}
      </p>
    </div>,
  );
}

export const canvasPuckConfig: Config<CanvasComponents, CanvasRootProps> = {
  root: {
    fields: {
      title: { type: "text", label: "Canvas name", contentEditable: true },
      subject: {
        type: "select",
        label: "Subject",
        options: [{ label: "Computer Science", value: "computer_science" }],
      },
      theme: {
        type: "select",
        label: "Theme",
        options: canvasThemeOptions.map((theme) => ({
          label: theme.name,
          value: theme.id,
        })),
      },
      typographyScale: {
        type: "select",
        label: "Text size",
        options: canvasTypographyOptions.map((scale) => ({
          label: scale.name,
          value: scale.id,
        })),
      },
      fontFamily: {
        type: "select",
        label: "Font style",
        options: canvasFontFamilyOptions.map((family) => ({
          label: family.name,
          value: family.id,
        })),
      },
    },
    render: ({ title, theme, typographyScale, fontFamily }) => (
      <main
        aria-label={title ? `${title} frames` : "Canvas frames"}
        className="grid min-h-full w-full content-start gap-6 bg-[var(--canvas-stage)] px-3  text-foreground transition-[background-color,color] duration-200 sm:px-4 lg:px-6"
        style={getCanvasThemeStyle(
          theme ?? DEFAULT_CANVAS_THEME,
          typographyScale ?? DEFAULT_CANVAS_TYPOGRAPHY_SCALE,
          fontFamily ?? DEFAULT_CANVAS_FONT_FAMILY,
        )}
      >
        {/*
          Explicit DropZone instead of the `children` Puck hands the root
          render, because `children` is the implicit default zone with NO
          allow-list — it accepted any block, so a Heading or Array dragged
          slightly past a frame's edge landed at canvas root, outside every
          frame, where it renders unstyled and is invisible to the AI (which
          only ever reads SlideBlock content). Restricting to SlideBlock
          means blocks can only ever live inside a frame. "default-zone" is
          Puck's own id for the root zone, so existing documents keep
          working — nothing about the stored shape changes.
        */}
        <DropZone zone="default-zone" allow={["SlideBlock"]} />
      </main>
    ),
  },
  categories: {
    text: {
      title: "Text",
      components: ["HeadingTextBlock", "SubheadingTextBlock", "BodyTextBlock"],
      defaultExpanded: true,
      
    },
    blocks: {
      title: "Blocks",
      components: [
        "SlideBlock",
        "CheckpointBlock",
        "ArrayBlock",
        "StackBlock",
        "QueueBlock",
        "LinkedListBlock",
        "MindMapBlock",
        "CodeBlock",
        "MermaidBlock",
        "TableBlock",
      ],
      defaultExpanded: true,
    },
  },
  components: {
    SlideBlock: {
      label: "Frame",
      
      fields: {
        title: { type: "text", label: "Frame title" },
        teachingBeat: {
          type: "select",
          label: "Teaching beat",
          options: [
            { label: "Hook", value: "hook" },
            { label: "Explain", value: "explain" },
            { label: "Practice", value: "practice" },
            { label: "Recap", value: "recap" },
          ],
        },

        content: {
          type: "slot",
          label: "Frame content",
          allow: [
            "HeadingTextBlock",
            "SubheadingTextBlock",
            "BodyTextBlock",
            "ArrayBlock",
            "StackBlock",
            "QueueBlock",
            "LinkedListBlock",
            "MindMapBlock",
            "CodeBlock",
            "MermaidBlock",
            "TableBlock",
            "CheckpointBlock",
            "SketchBlock",
          ],
        },
      },
      defaultProps: {
        frameLabel: "Frame",
        title: "New frame",
        teachingBeat: "explain",
        content: [],
      },
      render: ({ id, content, ...props }) => (
        <SlideBlock {...props} id={id} content={content} />
      ),
    },
    HeadingTextBlock: {
      label: "Heading",
      fields: {
        text: { type: "text", label: "Heading text" , contentEditable: true},
      },
      defaultProps: {
        text: "Heading",
      },
      render: HeadingTextBlock,
    },
    SubheadingTextBlock: {
      label: "Subheading",
      fields: {
        text: { type: "text", label: "Subheading text", contentEditable: true },
      },
      defaultProps: {
        text: "Subheading",
      },
      render: SubheadingTextBlock,
    },
    BodyTextBlock: {
      label: "Body",
      fields: {
        text: { type: "textarea", label: "Body text", contentEditable: true },
      },
      defaultProps: {
        text: "Body text",
      },
      render: BodyTextBlock,
    },
    ArrayBlock: {
      label: "Array",
      // No title/caption fields: the block draws only the strip, so editing
      // copy it would never show would just be confusing.
      fields: {
        values: {
          type: "array",
          label: "Array values",
          arrayFields: {
            value: { type: "text", label: "Value", contentEditable: true },
          },
          defaultItemProps: { value: "0" },
          getItemSummary: (item, index) => `Index ${index}: ${item.value}`,
        },
        highlightedIndex: {
          type: "number",
          label: "Highlighted index",
          min: 0,
          max: 9,
        },
        traversalTarget: {
          type: "number",
          label: "Traversal target index",
          min: 0,
          max: 9,
        },
        showIndices: {
          type: "radio",
          label: "Show indices",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
      },
      defaultProps: {
        title: "A",
        values: [{ value: "8" }, { value: "5" }, { value: "0" }],
        highlightedIndex: 0,
        showIndices: true,
        caption: "",
      },
      render: ArrayBlock,
    },
    StackBlock: {
      label: "Stack",
      fields: {
        title: { type: "text", label: "Title" , contentEditable: true },
        values: {
          type: "array",
          label: "Stack values (bottom to top)",
          arrayFields: {
            value: { type: "text", label: "Value", contentEditable: true },
          },
          defaultItemProps: { value: "0" },
          getItemSummary: (item, index) => `Position ${index}: ${item.value}`,
        },
        highlightedIndex: {
          type: "number",
          label: "Highlighted index",
          min: 0,
          max: 11,
        },
        traversalTarget: {
          type: "number",
          label: "Traversal target index",
          min: 0,
          max: 11,
        },
        isFixed: {
          type: "radio",
          label: "Fixed size",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        stackSize: {
          type: "number",
          label: "Stack size (fixed only)",
          min: 1,
          max: 12,
        },
        caption: { type: "textarea", label: "Caption", contentEditable: true },
      },
      defaultProps: {
        title: "Stack A",
        values: [{ value: "8" }, { value: "5" }, { value: "0" }],
        highlightedIndex: 2,
        caption: "Push adds to the top; pop removes from the top.",
        isFixed: false,
      },
      render: StackBlock,
    },
    QueueBlock: {
      label: "Queue",
      fields: {
        title: { type: "text", label: "Title" , contentEditable: true },
        values: {
          type: "array",
          label: "Queue values (front to back)",
          arrayFields: {
            value: { type: "text", label: "Value", contentEditable: true },
          },
          defaultItemProps: { value: "0" },
          getItemSummary: (item, index) => `Position ${index}: ${item.value}`,
        },
        highlightedIndex: {
          type: "number",
          label: "Highlighted index",
          min: 0,
          max: 11,
        },
        traversalTarget: {
          type: "number",
          label: "Traversal target index",
          min: 0,
          max: 11,
        },
        caption: { type: "textarea", label: "Caption" },
      },
      defaultProps: {
        title: "Queue A",
        values: [{ value: "8" }, { value: "5" }, { value: "0" }],
        highlightedIndex: 0,
        caption: "Enqueue adds to the back; dequeue removes from the front.",
      },
      render: QueueBlock,
    },
    LinkedListBlock: {
      label: "Linked list",
      fields: {
        title: { type: "text", label: "Title" },
        nodes: {
          type: "array",
          label: "Nodes",
          arrayFields: {
            value: { type: "text", label: "Value" },
          },
          defaultItemProps: { value: "node" },
          getItemSummary: (item, index) => `Node ${index}: ${item.value}`,
        },
        highlightedIndex: {
          type: "number",
          label: "Highlighted index",
          min: 0,
          max: 11,
        },
        traversalTarget: {
          type: "number",
          label: "Traversal target index",
          min: 0,
          max: 11,
        },
        caption: { type: "textarea", label: "Caption" },
      },
      defaultProps: {
        title: "Linked list",
        nodes: [{ value: "head" }, { value: "node" }, { value: "tail" }],
        highlightedIndex: 0,
        caption: "Each node points to the next node.",
      },
      render: LinkedListBlock,
    },
    MindMapBlock: {
      label: "Mind map",
      fields: {
        title: { type: "text", label: "Title" },
        center: { type: "text", label: "Center" },
        branches: {
          type: "array",
          label: "Branches",
          arrayFields: {
            label: { type: "text", label: "Label" },
            detail: { type: "text", label: "Detail" },
          },
          defaultItemProps: { label: "Idea", detail: "Detail" },
          getItemSummary: (item) => item.label,
        },
      },
      defaultProps: {
        title: "Concept map",
        center: "Array",
        branches: [
          { label: "Index", detail: "Position in the row" },
          { label: "Element", detail: "Value stored at a position" },
        ],
      },
      render: MindMapBlock,
    },
    CodeBlock: {
      label: "Code",
      fields: {
        title: { type: "text", label: "Title" },
        language: {
          type: "select",
          label: "Language",
          options: codeLanguageOptions,
        },
        code: { type: "textarea", label: "Code" },
        explanation: { type: "textarea", label: "Explanation" },
      },
      defaultProps: {
        title: "Array access",
        language: "javascript",
        code: "const value = A[2];",
        explanation: "Read the value at index 2.",
      },
      render: CodeBlock,
    },
    MermaidBlock: {
      label: "Mermaid",
      fields: {
        chart: { type: "textarea", label: "Mermaid code" },
        description: { type: "textarea", label: "Description" },
      },
      defaultProps: {
        chart:
          "flowchart TD\n  Start[Teacher prompt] --> Decide{Student question?}\n  Decide -->|Yes| Explain[Explain with example]\n  Decide -->|No| Practice[Move to practice]\n  Explain --> Practice",
        description:
          "Use Mermaid to sketch a diagram inside the frame for teaching flow.",
      },
      render: MermaidBlock,
    },
    TableBlock: {
      label: "Table",
      fields: {
        title: { type: "text", label: "Title" },
        columns: {
          type: "array",
          label: "Columns",
          arrayFields: {
            label: { type: "text", label: "Column label" },
          },
          defaultItemProps: { label: "Column" },
          getItemSummary: (item, index) =>
            item.label || `Column ${(index ?? 0) + 1}`,
        },
        rows: {
          type: "array",
          label: "Rows",
          arrayFields: {
            cells: {
              type: "textarea",
              label: "Cells",
            },
          },
          defaultItemProps: { cells: "Value | Detail | Note" },
          getItemSummary: (_item, index) => `Row ${(index ?? 0) + 1}`,
        },
        caption: { type: "textarea", label: "Caption" },
      },
      defaultProps: {
        title: "Comparison table",
        columns: [
          { label: "Concept" },
          { label: "What it means" },
          { label: "Example" },
        ],
        rows: [
          { cells: "Index | Position in the array | A[0]" },
          { cells: "Element | Value stored at an index | 42" },
        ],
        caption: "Use this to compare ideas live in class.",
      },
      render: TableBlock,
    },
    CheckpointBlock: {
      label: "Checkpoint",
      fields: {
        question: { type: "textarea", label: "Question" },
        answer: { type: "textarea", label: "Expected answer" },
      },
      defaultProps: {
        question: "What should students answer here?",
        answer: "Add the expected answer.",
      },
      render: CheckpointBlock,
    },
    SketchBlock: {
      label: "Drawing",
      fields: {
        widthPercent: {
          type: "select",
          label: "Width",
          options: sketchWidthOptions,
        },
        aiContext: {
          type: "custom",
          label: "Image context for AI",
          render: ({ value, onChange, readOnly }) => (
            <SketchContextField
              value={typeof value === "string" ? value : ""}
              onChange={onChange}
              readOnly={readOnly}
            />
          ),
        },
      },
      defaultProps: {
        widthPercent: DEFAULT_SKETCH_WIDTH_PERCENT,
        aiContext: "",
        src: "",
        aspectRatio: 1.6,
      },
      // The drag from the Draw panel can only carry this component's name, so
      // the exported image is collected here as the block is inserted.
      resolveData: async (data, { trigger }) => {
        if (trigger !== "insert" || data.props.src) {
          return data;
        }

        const sketch = await readPendingSketch();

        if (!sketch) {
          return data;
        }

        return {
          ...data,
          props: {
            ...data.props,
            src: sketch.src,
            aspectRatio: sketch.aspectRatio,
            widthPercent: sketch.widthPercent,
          },
        };
      },
      render: SketchBlock,
    },
  },
};
