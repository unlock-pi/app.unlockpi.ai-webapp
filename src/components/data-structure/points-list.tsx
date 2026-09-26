"use client";

import { usePuck } from "@puckeditor/core";
import { ChevronDownIcon, ListPlusIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useState, type ClipboardEvent as ReactClipboardEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import type { PointsListItem } from "@/features/canvas/types/canvas-types";
import { cn } from "@/lib/utils";

export function createPointsListItem(content = "New point"): PointsListItem {
  return { id: nanoid(), content, detail: "" };
}

/** Strips a leading "-", "*", "•", "1.", "2)" etc. left over from a copied list. */
function stripListMarker(line: string): string {
  return line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim();
}

/** Splits pasted multi-line text into individual, marker-stripped point lines. */
function splitPastedLines(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map(stripListMarker)
    .filter((line) => line.length > 0);
}

export function defaultPointsListItems(): PointsListItem[] {
  return [
    {
      id: nanoid(),
      content: "First point",
      detail: "Add supporting detail here — it stays hidden until a reader expands it.",
    },
    { id: nanoid(), content: "Second point", detail: "" },
  ];
}

/**
 * Reassigns a fresh id to any point missing one, or whose id collides with an
 * earlier point's — Puck's built-in array field "Duplicate" action copies a
 * row's props verbatim (it only re-ids nested slot fields), so a duplicated
 * point would otherwise share its source's id.
 */
export function dedupePointIds(points: PointsListItem[]): PointsListItem[] {
  const seen = new Set<string>();
  let changed = false;
  const next = points.map((point) => {
    if (typeof point.id !== "string" || !point.id || seen.has(point.id)) {
      changed = true;
      const id = nanoid();
      seen.add(id);
      return { ...point, id };
    }
    seen.add(point.id);
    return point;
  });
  return changed ? next : points;
}

/* -------------------------------------------------------------------------- */
/* Quick-add field — a sidebar-only custom field that lets an editor paste a  */
/* whole list (bullets, numbers, or plain lines) and turn it into several     */
/* points in one go. A single field's `onChange` can only ever update its own */
/* value, never splice new items into a sibling array field, so this reaches  */
/* into the block's `points` prop directly via Puck's public `usePuck`/       */
/* `dispatch` API instead — the same public API this app already calls from  */
/* the component palette, not a change to Puck internals.                    */
/* -------------------------------------------------------------------------- */

export function PointsListQuickAddField({ readOnly }: { readOnly?: boolean }) {
  const [draft, setDraft] = useState("");
  const { dispatch, selectedItem, getSelectorForId } = usePuck();

  function commitLines(lines: string[]) {
    if (lines.length === 0 || !selectedItem) return;
    const selector = getSelectorForId(selectedItem.props.id);
    if (!selector) return;
    const currentPoints = Array.isArray(selectedItem.props.points)
      ? (selectedItem.props.points as PointsListItem[])
      : [];
    const newItems = lines.map((line) => createPointsListItem(line));
    dispatch({
      type: "replace",
      data: {
        ...selectedItem,
        props: { ...selectedItem.props, points: [...currentPoints, ...newItems] },
      },
      destinationIndex: selector.index,
      destinationZone: selector.zone,
    });
    setDraft("");
  }

  function handlePaste(event: ReactClipboardEvent<HTMLTextAreaElement>) {
    const text = event.clipboardData.getData("text");
    const lines = splitPastedLines(text);
    if (lines.length <= 1) {
      // A single line pastes normally so it can still be edited before adding.
      return;
    }
    event.preventDefault();
    commitLines(lines);
  }

  return (
    <div className="grid gap-1.5">
      <Textarea
        value={draft}
        disabled={readOnly}
        onChange={(event) => setDraft(event.target.value)}
        onPaste={handlePaste}
        placeholder={"Paste a list here (one point per line) or type points, one per line"}
        size="sm"
        className="min-h-16"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={readOnly || !draft.trim()}
        onClick={() => commitLines(splitPastedLines(draft))}
        className="justify-self-start"
      >
        <ListPlusIcon className="size-3.5" />
        Add as points
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reader-facing render — this is what a published/preview canvas shows, and  */
/* (thanks to Puck's `contentEditable` field transform on `content`/`detail`) */
/* also what renders inline-editably on the canvas while editing.            */
/* Open/closed state here is local to the viewer, never written back to Puck.*/
/* -------------------------------------------------------------------------- */

export type PointsListProps = {
  points: PointsListItem[];
  listStyle: "bullet" | "numbered";
  defaultExpanded: boolean;
};

export function PointsList({ points, listStyle, defaultExpanded }: PointsListProps) {
  if (points.length === 0) {
    return null;
  }

  const ListTag = listStyle === "numbered" ? "ol" : "ul";

  return (
    <ListTag className="grid list-none gap-0.5 p-0">
      {points.map((point, index) => (
        <PointsListReaderItem
          key={point.id}
          point={point}
          index={index}
          listStyle={listStyle}
          defaultExpanded={defaultExpanded}
        />
      ))}
    </ListTag>
  );
}

/**
 * While editing on the canvas, Puck substitutes `content`/`detail` with its
 * own inline-editable React nodes (not plain strings) for any field marked
 * `contentEditable`. Guard every string-only operation against that.
 */
function asPlainText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function PointsListReaderItem({
  point,
  index,
  listStyle,
  defaultExpanded,
}: {
  point: PointsListItem;
  index: number;
  listStyle: "bullet" | "numbered";
  defaultExpanded: boolean;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  const isDetailInlineEditable = typeof point.detail !== "string";
  const hasDetail = isDetailInlineEditable || asPlainText(point.detail).trim().length > 0;

  return (
    <li className="list-none">
      <Collapsible open={hasDetail && open} onOpenChange={hasDetail ? setOpen : undefined}>
        <CollapsibleTrigger
          disabled={!hasDetail}
          aria-label={hasDetail ? `${open ? "Collapse" : "Expand"} point ${index + 1}` : undefined}
          className={cn(
            "group flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
            hasDetail ? "hover:bg-muted/60" : "cursor-default",
          )}
        >
          {listStyle === "numbered" ? (
            <span className="mt-0.5 w-4 shrink-0 text-right text-sm font-medium tabular-nums text-muted-foreground">
              {index + 1}.
            </span>
          ) : (
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden />
          )}
          <span className="flex-1 text-sm font-medium leading-relaxed text-foreground">
            {point.content}
          </span>
          {hasDetail ? (
            <ChevronDownIcon
              className={cn(
                "mt-1 size-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200 ease-in-out",
                open && "rotate-180",
              )}
              aria-hidden
            />
          ) : null}
        </CollapsibleTrigger>
        {hasDetail ? (
          <CollapsiblePanel>
            <p className="pb-2 pl-[1.65rem] pr-2 pt-0.5 text-sm leading-relaxed text-muted-foreground">
              {point.detail}
            </p>
          </CollapsiblePanel>
        ) : null}
      </Collapsible>
    </li>
  );
}
