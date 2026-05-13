"use client";

import { motion } from "motion/react";
import type { HighlightType } from "@/features/talk/lib/board";

const HIGHLIGHT_STYLES: Record<HighlightType, { bg: string; border: string; label: string }> = {
  important: { bg: "rgba(220, 38, 38, 0.25)", border: "#DC2626", label: "Important" },
  definition: { bg: "rgba(3, 100, 206, 0.25)", border: "#0364CE", label: "Definition" },
  warning: { bg: "rgba(245, 158, 11, 0.25)", border: "#F59E0B", label: "Warning" },
  exam: { bg: "rgba(139, 92, 246, 0.25)", border: "#8B5CF6", label: "Exam" },
  focus: { bg: "rgba(249, 115, 22, 0.25)", border: "#F97316", label: "Focus" },
  note: { bg: "rgba(156, 163, 175, 0.2)", border: "#9CA3AF", label: "Note" },
};

interface BlockHighlightProps {
  type: HighlightType;
  children: React.ReactNode;
}

export function BlockHighlight({ type, children }: BlockHighlightProps) {
  const style = HIGHLIGHT_STYLES[type] ?? HIGHLIGHT_STYLES.important;

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        backgroundColor: style.bg,
        borderLeft: `3px solid ${style.border}`,
      }}
      className="rounded-r pl-3 py-1.5 my-1"
    >

      {/* TODO: I"ve rm the imp and other highlighting labels */}
      {/* <span
        className="text-xs font-semibold uppercase tracking-wider mb-0.5 block"
        style={{ color: style.border, opacity: 0.8 }}
      >
        {style.label}
      </span> */}
      {children}
    </motion.div>
  );
}
