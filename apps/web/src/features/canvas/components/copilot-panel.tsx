"use client";

import { useCallback, useRef, useState } from "react";
import {
  BookOpenIcon,
  Code2Icon,
  SparklesIcon,
  TableIcon,
  WorkflowIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { cjk } from "@streamdown/cjk";
import { code as shikiCode } from "@streamdown/code";
import { math } from "@streamdown/math";
import { Streamdown } from "streamdown";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MermaidPreview } from "@/features/visuals/components/mermaid-preview";
import type {
  CopilotPanelItem,
  PanelItemType,
} from "@/features/canvas/lib/panel-generation";
import { cn } from "@/lib/utils";

const TYPE_META: Record<PanelItemType, { icon: LucideIcon; label: string }> = {
  explanation: { icon: BookOpenIcon, label: "Explanation" },
  mermaid: { icon: WorkflowIcon, label: "Diagram" },
  table: { icon: TableIcon, label: "Table" },
  code: { icon: Code2Icon, label: "Code" },
};

// Mermaid isn't in here — "mermaid" items render through MermaidPreview (with
// its own parse-repair loop), not through Streamdown's mermaid fences.
const streamdownPlugins = { cjk, code: shikiCode, math };

const PANEL_MIN_WIDTH = 336; // current default (21rem)
const PANEL_MAX_WIDTH = 560; // "a little more" room to drag open

type CopilotPanelProps = {
  items: CopilotPanelItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
};

export function CopilotPanel({ items, onClose, onRemove }: CopilotPanelProps) {
  const [width, setWidth] = useState(PANEL_MIN_WIDTH);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    // Panel is on the right; dragging left (negative dx) grows it.
    const dx = drag.startX - event.clientX;
    const next = Math.min(
      PANEL_MAX_WIDTH,
      Math.max(PANEL_MIN_WIDTH, drag.startWidth + dx),
    );
    setWidth(next);
  }, []);

  const stopDragging = useCallback(
    (event: PointerEvent) => {
      dragStateRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      void event;
    },
    [handlePointerMove],
  );

  const startDragging = (event: React.PointerEvent) => {
    dragStateRef.current = { startX: event.clientX, startWidth: width };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
  };

  return (
    <aside
      style={{ width }}
      className="relative hidden shrink-0 flex-col border-l border-border bg-card/40 backdrop-blur-xl sm:flex"
    >
      <button
        type="button"
        aria-label="Drag to resize panel"
        onPointerDown={startDragging}
        className="absolute -left-1.5 top-0 z-10 h-full w-3 cursor-col-resize touch-none select-none bg-transparent hover:bg-primary/10 active:bg-primary/15"
      />

      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-semibold">Copilot</span>
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Hide panel"
          onClick={onClose}
        >
          <XIcon className="size-3.5" />
        </Button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="px-1 pt-6 text-center text-xs text-muted-foreground">
            Explanations, diagrams, tables and code the Copilot creates during
            class will appear here.
          </p>
        ) : (
          items.map((item) => (
            <PanelItemCard key={item.id} item={item} onRemove={onRemove} />
          ))
        )}
      </div>
    </aside>
  );
}

function PanelItemCard({
  item,
  onRemove,
}: {
  item: CopilotPanelItem;
  onRemove: (id: string) => void;
}) {
  const { icon: Icon, label } = TYPE_META[item.type];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate text-xs font-medium">{item.topic || label}</span>
        </div>
        <button
          type="button"
          aria-label="Remove"
          onClick={() => onRemove(item.id)}
          className="shrink-0 text-muted-foreground/60 transition hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
      <div className="p-3">
        <PanelItemBody item={item} />
      </div>
    </div>
  );
}

function PanelItemBody({ item }: { item: CopilotPanelItem }) {
  if (item.status === "pending") {
    return <PanelSkeleton type={item.type} />;
  }

  if (item.status === "error") {
    return (
      <p className="text-xs text-muted-foreground">
        Couldn&apos;t create this. Ask again in a moment.
      </p>
    );
  }

  const content = item.content ?? "";

  if (item.type === "mermaid") {
    return <MermaidPreview code={content} />;
  }

  if (item.type === "code") {
    // Wrap as a fenced block so Streamdown's Shiki plugin syntax-highlights it,
    // instead of a plain <pre> — reuses the highlighter already wired up for
    // chat messages rather than hand-rolling one.
    const fenced = "```" + (item.language ?? "") + "\n" + content + "\n```";
    return (
      <div className="text-xs [&_pre]:max-h-72 [&_pre]:overflow-auto [&_pre]:text-[11px]">
        <Streamdown plugins={streamdownPlugins}>{fenced}</Streamdown>
      </div>
    );
  }

  if (item.type === "table") {
    return <MarkdownTable markdown={content} />;
  }

  return (
    <div className="text-xs leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <Streamdown plugins={streamdownPlugins}>{content}</Streamdown>
    </div>
  );
}

/**
 * Loading state shown the instant a request lands. Uses coss's shimmer
 * Skeleton (a moving highlight gradient, not a flat pulse) so it reads as
 * "something is being built" rather than a generic placeholder.
 */
function PanelSkeleton({ type }: { type: PanelItemType }) {
  if (type === "mermaid") {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }
  if (type === "code") {
    return (
      <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-2.5">
        <Skeleton className="h-2.5 w-3/5" />
        <Skeleton className="h-2.5 w-4/5" />
        <Skeleton className="h-2.5 w-2/5" />
        <Skeleton className="h-2.5 w-3/4" />
      </div>
    );
  }
  if (type === "table") {
    return (
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/** Parse a Markdown table into the coss Table component. Falls back to raw text. */
function MarkdownTable({ markdown }: { markdown: string }) {
  const rows = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"))
    .map((line) =>
      line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim()),
    );

  // Drop the |---|---| separator row.
  const dataRows = rows.filter(
    (row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell) || cell === ""),
  );

  if (dataRows.length < 1) {
    return <p className="whitespace-pre-wrap text-xs">{markdown}</p>;
  }

  const [header, ...body] = dataRows;

  return (
    <div className="overflow-x-auto">
      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            {header.map((cell, index) => (
              <TableHead key={index} className="h-8 px-2">
                {cell}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {body.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className="px-2 py-1.5">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
