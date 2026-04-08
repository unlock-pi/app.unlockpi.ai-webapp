"use client";

import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Line } from "@/types/board";
import { BlockHighlight } from "./block-highlight";

interface LineRendererProps {
  line: Line;
}

export function LineRenderer({ line }: LineRendererProps) {
  const content = (
    <motion.div
      key={line.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="text-gray-100"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }) => (
            <h1 className={`mt-2 mb-5 border-b border-red-500/30 pb-3 text-4xl font-semibold tracking-[-0.03em] text-white ${props.className ?? ""}`.trim()}>{children}</h1>
          ),
          p: ({ children, ...props }) => (
            <p className={`my-3 text-[1.02rem] leading-8 text-gray-100/95 ${props.className ?? ""}`.trim()}>{children}</p>
          ),
          h2: ({ children, ...props }) => (
            <h2 className={`mt-8 mb-3 text-2xl font-semibold tracking-[-0.02em] text-red-100 ${props.className ?? ""}`.trim()}>{children}</h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className={`mt-6 mb-2 text-xl font-semibold uppercase tracking-[0.12em] text-gray-300 ${props.className ?? ""}`.trim()}>{children}</h3>
          ),
          ul: ({ children, ...props }) => (
            <ul {...props} className={`my-4 list-disc space-y-1 pl-6 marker:text-red-300 ${props.className ?? ""}`.trim()}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol {...props} className={`my-4 list-decimal space-y-1 pl-6 marker:text-red-300 ${props.className ?? ""}`.trim()}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li {...props} className={`my-1.5 pl-1 text-[0.98rem] leading-7 text-gray-100/90 ${props.className ?? ""}`.trim()}>
              {children}
            </li>
          ),
          strong: ({ children, ...props }) => (
            <strong {...props} className={`font-semibold text-white ${props.className ?? ""}`.trim()}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em {...props} className={`font-medium text-red-100/95 ${props.className ?? ""}`.trim()}>
              {children}
            </em>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              {...props}
              className={`my-5 rounded-r-2xl border-l-4 border-red-500/70 bg-white/[0.04] px-5 py-4 text-gray-100/90 ${props.className ?? ""}`.trim()}
            >
              {children}
            </blockquote>
          ),
          hr: ({ ...props }) => (
            <hr {...props} className={`my-8 h-px border-0 bg-gradient-to-r from-transparent via-red-500/70 to-transparent ${props.className ?? ""}`.trim()} />
          ),
          code: ({ className, children, ...props }) => (
            <code
              className={`rounded-md border border-red-500/25 bg-red-500/10 px-2 py-1 text-[0.92em] font-medium text-red-100 ${className ?? ""}`.trim()}
              {...props}
            >
              {children}
            </code>
          ),
        }}
      >
        {line.text}
      </ReactMarkdown>
    </motion.div>
  );

  if (line.highlight) {
    return <BlockHighlight type={line.highlight}>{content}</BlockHighlight>;
  }

  return <div className="my-1.5 text-gray-100">{content}</div>;
}
