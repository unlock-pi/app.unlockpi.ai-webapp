"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { AnimatePresence, motion } from "motion/react";
import { PhotoProvider } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
import { cn } from "@/lib/utils";
import {
  createBoardMarkdownComponents,
} from "@/components/renderers/board-markdown-components";
import {
  HighlightWord,
} from "@/components/renderers/board-highlight";

interface BoardPanelProps {
  content: string;
  highlights: HighlightWord[];
  className?: string;
}

export type { HighlightWord };

export function BoardPanel({ content, highlights, className }: BoardPanelProps) {
  const components = useMemo<Components>(() => createBoardMarkdownComponents(highlights), [highlights]);

  return (
    <div
      className={cn(
        "w-full max-w-7xl p-6 rounded-xl relative z-10",
        "bg-[var(--color-darkest-gray)] border border-[var(--color-darker-gray)]",
        "text-white text-lg leading-relaxed shadow-xl overflow-y-auto",
        className
      )}
    >
      <PhotoProvider
        speed={() => 300}
        easing={(type) =>
          type === 2
            ? "cubic-bezier(0.36,0,0.66,-0.56)"
            : "cubic-bezier(0.34,1.56,0.64,1)"
        }
        maskOpacity={0.85}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={content.slice(0, 50)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="prose prose-invert max-w-none
              prose-p:max-w-none prose-p:leading-relaxed
              prose-headings:max-w-none prose-headings:font-semibold
              prose-strong:text-white
              prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-transparent prose-pre:p-0
              prose-hr:border-0"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={components}
            >
              {content || "*Board is empty...*"}
            </ReactMarkdown>
          </motion.div>
        </AnimatePresence>
      </PhotoProvider>
    </div>
  );
}
