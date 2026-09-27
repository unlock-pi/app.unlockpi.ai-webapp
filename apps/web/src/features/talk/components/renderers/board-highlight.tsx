import React from "react";
import { motion } from "motion/react";

export interface HighlightRule {
  color: string;
  style: "highlight" | "underline";
}

export interface HighlightWord {
  word: string;
  type: string;
  positions?: number[];
}

const DEFAULT_RED = "#DC2626";
const SECONDARY_BLUE = "#0364CE";

const STYLE_MAP: Record<string, HighlightRule> = {
  highlight: { color: DEFAULT_RED, style: "highlight" },
  underline: { color: DEFAULT_RED, style: "underline" },
  noun: { color: DEFAULT_RED, style: "highlight" },
  verb: { color: DEFAULT_RED, style: "underline" },
  secondary: { color: SECONDARY_BLUE, style: "highlight" },
  "secondary-underline": { color: SECONDARY_BLUE, style: "underline" },
  concept: { color: SECONDARY_BLUE, style: "highlight" },
  blue: { color: SECONDARY_BLUE, style: "highlight" },
};

const FALLBACK_STYLE: HighlightRule = { color: "#facc15", style: "highlight" };

export function highlightContent(children: React.ReactNode, highlights: HighlightWord[]): React.ReactNode {
  if (typeof children === "string") {
    return splitTextOnHighlights(children, highlights);
  }

  if (Array.isArray(children)) {
    return children.map((child, index) => (
      <React.Fragment key={index}>{highlightContent(child, highlights)}</React.Fragment>
    ));
  }

  if (React.isValidElement(children)) {
    const element = children as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.props.children) {
      return React.cloneElement(element, {
        ...element.props,
        children: highlightContent(element.props.children, highlights),
      });
    }
  }

  return children;
}

function splitTextOnHighlights(text: string, highlights: HighlightWord[]): React.ReactNode {
  if (!highlights.length || !text) return text;

  const pattern = new RegExp(`(${highlights.map((item) => escapeRegExp(item.word)).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const lowered = part.toLowerCase();
    const match = highlights.find((item) => item.word.toLowerCase() === lowered);

    if (!match) {
      return part;
    }

    const rule = STYLE_MAP[match.type.toLowerCase()] || FALLBACK_STYLE;
    const style: React.CSSProperties =
      rule.style === "highlight"
        ? {
            backgroundColor: `${rule.color}28`,
            borderBottom: `2px solid ${rule.color}`,
          }
        : {
            textDecoration: "underline",
            textDecorationColor: rule.color,
            textDecorationThickness: "2px",
          };

    return (
      <motion.span
        key={index}
        initial={{ backgroundColor: "transparent" }}
        animate={{ backgroundColor: style.backgroundColor }}
        style={style}
        className="rounded px-0.5 mx-0.5 inline-block"
      >
        {part}
      </motion.span>
    );
  });
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
