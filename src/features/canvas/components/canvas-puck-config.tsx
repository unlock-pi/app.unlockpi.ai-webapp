"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Config, SlotComponent } from "@puckeditor/core";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  CopyIcon,
  MoreHorizontalIcon,
  PlusIcon,
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
import Logo from "@/components/logo";

import { MermaidDiagram } from "@/features/talk/components/renderers/mermaid-diagram";
import { ArrayStrip } from "@/features/courses/arrays/components/array-strip";
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
  SlideBlockProps,
  SubheadingTextBlockProps,
  TableBlockProps,
} from "@/features/canvas/types/canvas-types";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CANVAS_THEME,
  DEFAULT_CANVAS_TYPOGRAPHY_SCALE,
  canvasThemeOptions,
  canvasTypographyOptions,
  getCanvasThemeStyle,
} from "@/features/canvas/lib/canvas-theme";

const beatLabels: Record<SlideBlockProps["teachingBeat"], string> = {
  hook: "Hook",
  explain: "Explain",
  practice: "Practice",
  recap: "Recap",
};

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
        "rounded-lg border border-border bg-card p-5 shadow-xs",
        className,
      )}
    >
      {children}
    </section>
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
  teachingBeat,
  notes,
  content: Content,
}: SlideRenderProps) {
  const label = frameLabel ?? "Frame";

  return (
    <article
      id={`canvas-slide-${id}`}
      className="mx-auto w-full max-w-5xl scroll-mt-4"
    >
      <div className="mb-0 flex items-center justify-between gap-3 px-1 text-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <p className="shrink-0 text-sm font-semibold">{label}</p>
          <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {beatLabels[teachingBeat]}
          </span>
          <p className="truncate text-xs text-muted-foreground">{title}</p>
        </div>

        <Drawer position="right">
          <DrawerTrigger
            render={
              <button
                type="button"
                aria-label={`${label} actions`}
                className="grid size-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
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
        title={notes}
        className="flex min-h-[560px] min-w-0 w-full flex-col gap-5 rounded-lg border border-border bg-background p-4 text-foreground shadow-[0_22px_70px_var(--canvas-shadow-color)] sm:p-5 lg:p-7"
      >
        <Content
          allow={[
            "HeadingTextBlock",
            "SubheadingTextBlock",
            "BodyTextBlock",
            "ArrayBlock",
            "LinkedListBlock",
            "MindMapBlock",
            "CodeBlock",
            "MermaidBlock",
            "TableBlock",
            "CheckpointBlock",
          ]}
          className="grid min-h-[470px] min-w-0 flex-1 content-start gap-4 rounded-lg border border-dashed border-border/70 bg-muted/10 p-3 sm:p-4"
        />
        <div className="flex items-center justify-end gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
          <span>Made with</span>
          <Logo
            link={false}
            width={18}
            height={18}
            className="rounded-full bg-background/70"
          />
          <span>UnlockPi</span>
        </div>
      </section>
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

function ArrayBlock({
  title,
  values,
  highlightedIndex,
  showIndices,
  caption,
}: ArrayBlockProps) {
  const arrayValues = values.map((item) => item.value);

  return blockShell(
    "overflow-x-auto",
    <div className="grid gap-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
      </div>
      <ArrayStrip
        activeIndex={highlightedIndex}
        className="max-w-none justify-start"
        data={arrayValues}
        name="A"
        showIndex={showIndices}
      />
    </div>,
  );
}

function LinkedListBlock({ title, nodes, caption }: LinkedListBlockProps) {
  return blockShell(
    "overflow-x-auto",
    <div className="grid gap-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
      </div>
      <div className="flex min-w-max items-center gap-3">
        {nodes.map((node, index) => (
          <div
            key={`${node.value}-${index}`}
            className="flex items-center gap-3"
          >
            <div className="grid h-16 min-w-24 place-items-center rounded-lg border border-border bg-muted/30 px-4 text-lg font-semibold">
              {node.value}
            </div>
            {index < nodes.length - 1 ? (
              <span className="text-muted-foreground">{"->"}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>,
  );
}

function MindMapBlock({ title, center, branches }: MindMapBlockProps) {
  return blockShell(
    undefined,
    <div className="grid gap-4">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-center font-semibold">
          {center}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {branches.map((branch, index) => (
            <div
              key={`${branch.label}-${index}`}
              className="rounded-lg border border-border p-3"
            >
              <p className="font-medium">{branch.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {branch.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
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
      <MermaidDiagram chart={chart} />
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
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
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

function CheckpointBlock({ question, answer }: CheckpointBlockProps) {
  return blockShell(
    "border-emerald-500/30 bg-emerald-500/5",
    <div className="grid gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
        Checkpoint
      </p>
      <h3 className="text-lg font-semibold tracking-tight">{question}</h3>
      <p className="rounded-lg border border-emerald-500/20 bg-background/72 p-3 text-sm text-muted-foreground">
        {answer}
      </p>
    </div>,
  );
}

export const canvasPuckConfig: Config<CanvasComponents, CanvasRootProps> = {
  root: {
    fields: {
      title: { type: "text", label: "Canvas title" },
      subject: {
        type: "select",
        label: "Subject",
        options: [{ label: "Computer Science", value: "computer_science" }],
      },
      theme: {
        type: "select",
        label: "Canvas theme",
        options: canvasThemeOptions.map((theme) => ({
          label: theme.name,
          value: theme.id,
        })),
      },
      typographyScale: {
        type: "select",
        label: "Typography size",
        options: canvasTypographyOptions.map((scale) => ({
          label: scale.name,
          value: scale.id,
        })),
      },
    },
    render: ({ children, title, theme, typographyScale }) => (
      <main
        aria-label={title ? `${title} frames` : "Canvas frames"}
        className="grid min-h-full w-full content-start gap-6 bg-[var(--canvas-stage)] px-3 py-6 text-foreground transition-[background-color,color] duration-200 sm:px-4 lg:px-6"
        style={getCanvasThemeStyle(
          theme ?? DEFAULT_CANVAS_THEME,
          typographyScale ?? DEFAULT_CANVAS_TYPOGRAPHY_SCALE,
        )}
      >
        {children}
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
        notes: { type: "textarea", label: "Teacher notes" },
        content: {
          type: "slot",
          label: "Frame content",
          allow: [
            "HeadingTextBlock",
            "SubheadingTextBlock",
            "BodyTextBlock",
            "ArrayBlock",
            "LinkedListBlock",
            "MindMapBlock",
            "CodeBlock",
            "MermaidBlock",
            "TableBlock",
            "CheckpointBlock",
          ],
        },
      },
      defaultProps: {
        frameLabel: "Frame",
        title: "New frame",
        teachingBeat: "explain",
        notes: "Add the teaching move for this frame.",
        content: [],
      },
      render: ({ id, content, ...props }) => (
        <SlideBlock {...props} id={id} content={content} />
      ),
    },
    HeadingTextBlock: {
      label: "Heading",
      fields: {
        text: { type: "text", label: "Heading text" },
      },
      defaultProps: {
        text: "Heading",
      },
      render: HeadingTextBlock,
    },
    SubheadingTextBlock: {
      label: "Subheading",
      fields: {
        text: { type: "text", label: "Subheading text" },
      },
      defaultProps: {
        text: "Subheading",
      },
      render: SubheadingTextBlock,
    },
    BodyTextBlock: {
      label: "Body",
      fields: {
        text: { type: "textarea", label: "Body text" },
      },
      defaultProps: {
        text: "Body text",
      },
      render: BodyTextBlock,
    },
    ArrayBlock: {
      label: "Array",
      fields: {
        title: { type: "text", label: "Title" },
        values: {
          type: "array",
          label: "Array values",
          arrayFields: {
            value: { type: "text", label: "Value" },
          },
          defaultItemProps: { value: "0" },
          getItemSummary: (item, index) => `Index ${index}: ${item.value}`,
        },
        highlightedIndex: {
          type: "number",
          label: "Highlighted index",
          min: 0,
          max: 11,
        },
        showIndices: {
          type: "radio",
          label: "Show indices",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        caption: { type: "textarea", label: "Caption" },
      },
      defaultProps: {
        title: "Array A",
        values: [{ value: "8" }, { value: "5" }, { value: "0" }],
        highlightedIndex: 0,
        showIndices: true,
        caption: "Explain this array live.",
      },
      render: ArrayBlock,
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
        caption: { type: "textarea", label: "Caption" },
      },
      defaultProps: {
        title: "Linked list",
        nodes: [{ value: "head" }, { value: "node" }, { value: "tail" }],
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
  },
};
