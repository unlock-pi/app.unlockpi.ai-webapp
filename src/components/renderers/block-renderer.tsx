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
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-4 border border-white/10 rounded-lg">
      <table className={`w-full text-left border-collapse ${props.className ?? ""}`.trim()} {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className={`bg-white/5 text-gray-300 ${props.className ?? ""}`.trim()} {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody className={props.className}>{children}</tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr className={`border-b border-white/10 last:border-0 ${props.className ?? ""}`.trim()} {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th className={`p-3 font-semibold ${props.className ?? ""}`.trim()} {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className={`p-3 ${props.className ?? ""}`.trim()} {...props}>
      {children}
    </td>
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
