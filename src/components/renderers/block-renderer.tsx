"use client";

import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Block } from "@/types/board";
import { LineRenderer } from "./line-renderer";
import { FormulaBlock } from "./formula-block";
import { MermaidDiagram } from "./mermaid-diagram";

const paragraphMarkdownComponents: Components = {
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
  table: ({ children, ...props }) => (
    <div className="my-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_14px_44px_rgba(0,0,0,0.2)]">
      <table className={`w-full border-collapse text-left text-[0.98rem] ${props.className ?? ""}`.trim()} {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className={`bg-white/[0.06] text-[0.78rem] uppercase tracking-[0.18em] text-red-100/90 ${props.className ?? ""}`.trim()} {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody className={`divide-y divide-white/8 ${props.className ?? ""}`.trim()}>{children}</tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr className={`transition-colors odd:bg-white/[0.02] hover:bg-white/[0.05] ${props.className ?? ""}`.trim()} {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th className={`px-4 py-3 font-semibold ${props.className ?? ""}`.trim()} {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className={`px-4 py-3 align-top text-gray-100/92 ${props.className ?? ""}`.trim()} {...props}>
      {children}
    </td>
  ),
  img: ({ src, alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === "string" ? src : ""}
      alt={alt ?? ""}
      className="my-4 max-w-full rounded-lg border border-white/10"
      {...props}
    />
  ),
};

interface BlockRendererProps {
  block: Block;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="mb-4"
    >
      {renderBlockContent(block)}
    </motion.div>
  );
}

function renderBlockContent(block: Block) {
  switch (block.type) {
    case "paragraph":
      if (block.lines.some((line) => line.highlight)) {
        return (
          <div className="text-white text-lg leading-relaxed">
            {block.lines.map((line) => (
              <LineRenderer key={line.id} line={line} />
            ))}
          </div>
        );
      }

      return (
        <div className="text-white text-lg leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={paragraphMarkdownComponents}>
            {block.lines.map((line) => line.text).join("\n")}
          </ReactMarkdown>
        </div>
      );

    case "formula":
      return (
        <div className="my-2 p-4 rounded-lg bg-white/5 border border-white/10">
          <FormulaBlock formula={block.formula} />
        </div>
      );

    case "diagram":
      return (
        <div className="my-2 p-4 rounded-lg bg-white/5 border border-white/10">
          <MermaidDiagram chart={block.content} />
        </div>
      );

    default:
      return null;
  }
}
