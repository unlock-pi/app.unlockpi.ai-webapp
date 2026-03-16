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
          p: ({ children, ...props }) => (
            <p className={`my-1 leading-relaxed ${props.className ?? ""}`.trim()}>{children}</p>
          ),
          h2: ({ children, ...props }) => (
            <h2 className={`text-2xl font-semibold mt-3 mb-2 text-white ${props.className ?? ""}`.trim()}>{children}</h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className={`text-xl font-semibold mt-2 mb-1 text-gray-100 ${props.className ?? ""}`.trim()}>{children}</h3>
          ),
          ul: ({ children, ...props }) => (
            <ul {...props} className={`list-disc pl-6 my-1 space-y-1 ${props.className ?? ""}`.trim()}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol {...props} className={`list-decimal pl-6 my-1 space-y-1 ${props.className ?? ""}`.trim()}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li {...props} className={`leading-relaxed ${props.className ?? ""}`.trim()}>
              {children}
            </li>
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
