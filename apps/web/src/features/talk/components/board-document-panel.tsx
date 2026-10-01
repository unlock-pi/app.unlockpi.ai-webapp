"use client";

import { AnimatePresence } from "motion/react";
import type { BoardDocument } from "@/features/talk/lib/board";
import { BlockRenderer } from "@/features/talk/components/renderers/block-renderer";
import { cn } from "@/lib/utils";

interface BoardDocumentPanelProps {
  document: BoardDocument;
  className?: string;
}

export function BoardDocumentPanel({ document, className }: BoardDocumentPanelProps) {
  return (
    <div
      className={cn(
        "w-full max-w-7xl p-6 rounded-xl relative z-10",
        "bg-[var(--color-darkest-gray)] border border-[var(--color-darker-gray)]",
        "text-white text-lg leading-relaxed shadow-xl overflow-y-auto",
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {document.blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </AnimatePresence>

      {document.blocks.length === 0 && (
        <p className="text-gray-500 italic">Board is empty...</p>
      )}
    </div>
  );
}
