import type { ReactNode } from "react";

import { Highlighter } from "@/components/ui/highlighter";
import type {
  TextHighlightCategory,
  TextHighlightMark,
  TextHighlightStyle,
} from "@/features/canvas/types/canvas-types";

/**
 * Default look for each category, so "highlight the pronouns" reads the same
 * way on every frame without the model having to invent a style and color
 * every time it calls the tool. A mark's own `style`/`color`/`textColor`
 * still wins when it sets one — this is only the fallback.
 *
 * `markColor`/`markTextColor` are the background + font color pair used when
 * the resolved style is `"mark"` — kept separate from `color` (the rough-
 * notation stroke color) because a stroke needs a bold, visible hue while a
 * full-width background needs to stay soft enough for the font color to read
 * over it.
 */
export const TEXT_HIGHLIGHT_PRESETS: Record<
  TextHighlightCategory,
  {
    style: TextHighlightStyle;
    color: string;
    markColor: string;
    markTextColor: string;
    label: string;
  }
> = {
  pronoun: {
    style: "circle",
    color: "#5b9df9",
    markColor: "#dbeafe",
    markTextColor: "#1e40af",
    label: "Pronoun",
  },
  transition: {
    style: "underline",
    color: "#b083f0",
    markColor: "#ede9fe",
    markTextColor: "#6d28d9",
    label: "Transition word",
  },
  structure: {
    style: "box",
    color: "#4fbf8b",
    markColor: "#d1fae5",
    markTextColor: "#047857",
    label: "Structure word",
  },
  custom: {
    style: "mark",
    color: "#ffd166",
    markColor: "#fef3c7",
    markTextColor: "#92400e",
    label: "Highlighted",
  },
};

/** Gap between one mark starting to draw and the next, for the "in order" reveal. */
const REVEAL_STAGGER_MS = 420;

function resolveVisual(mark: TextHighlightMark) {
  const preset = TEXT_HIGHLIGHT_PRESETS[mark.category] ?? TEXT_HIGHLIGHT_PRESETS.custom;
  const style = mark.style ?? preset.style;

  if (style === "mark") {
    return {
      style,
      color: mark.color ?? preset.markColor,
      textColor: mark.textColor ?? preset.markTextColor,
    };
  }

  return {
    style,
    color: mark.color ?? preset.color,
    textColor: mark.textColor,
  };
}

type ResolvedMark = TextHighlightMark & { start: number; end: number; revealOrder: number };

/**
 * Turn each mark's exact-text quote into a character range inside `text`,
 * dropping marks that no longer match (the text was edited after the tool
 * quoted it) and marks that overlap one already claimed — first one in the
 * array wins, so the model's own priority order is respected.
 */
function resolveMarks(text: string, marks: TextHighlightMark[]): ResolvedMark[] {
  const lowerText = text.toLowerCase();
  const claimed: Array<{ start: number; end: number }> = [];
  const resolved: ResolvedMark[] = [];

  marks.forEach((mark, index) => {
    const needle = mark.text.trim().toLowerCase();
    if (!needle) return;

    const occurrence = Math.max(0, mark.occurrence ?? 0);
    let searchFrom = 0;
    let start = -1;
    for (let seen = 0; seen <= occurrence; seen += 1) {
      start = lowerText.indexOf(needle, searchFrom);
      if (start === -1) break;
      searchFrom = start + 1;
    }
    if (start === -1) return;

    const end = start + needle.length;
    const overlapsClaimed = claimed.some((range) => start < range.end && end > range.start);
    if (overlapsClaimed) return;

    claimed.push({ start, end });
    resolved.push({ ...mark, start, end, revealOrder: mark.order ?? index });
  });

  return resolved.sort((a, b) => a.start - b.start);
}

/**
 * Render a text block's string with its highlight marks wrapped in
 * `Highlighter`s, staggered to reveal in `order` (not necessarily left-to-
 * right reading order — "highlight every pronoun, then every transition
 * word" reveals as two waves, not one sweep across the sentence).
 *
 * Returns the plain string unchanged when there is nothing to mark, so every
 * text block can call this unconditionally.
 */
export function renderHighlightedText(text: string, marks?: TextHighlightMark[]): ReactNode {
  if (!marks || marks.length === 0) return text;

  const resolved = resolveMarks(text, marks);
  if (resolved.length === 0) return text;

  const revealDelay = new Map(
    [...resolved]
      .sort((a, b) => a.revealOrder - b.revealOrder)
      .map((mark, index) => [mark.id, index * REVEAL_STAGGER_MS] as const),
  );

  const nodes: ReactNode[] = [];
  let cursor = 0;

  resolved.forEach((mark, index) => {
    if (mark.start > cursor) {
      nodes.push(text.slice(cursor, mark.start));
    }
    const visual = resolveVisual(mark);
    nodes.push(
      <Highlighter
        key={mark.id || `${mark.start}-${index}`}
        action={visual.style}
        color={visual.color}
        textColor={visual.textColor}
        delay={revealDelay.get(mark.id) ?? 0}
      >
        {text.slice(mark.start, mark.end)}
      </Highlighter>,
    );
    cursor = mark.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
