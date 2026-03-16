import React from "react";
import { PhotoView } from "react-photo-view";
import { highlightContent, HighlightWord } from "@/components/renderers/board-highlight";
import { MermaidDiagram } from "@/components/renderers/mermaid-diagram";
import type { Components } from "react-markdown";
import remarkGfm from 'remark-gfm'

type MarkdownRendererProps = {
  children?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>;

type ImageRendererProps = {
  children?: React.ReactNode;
} & React.ImgHTMLAttributes<HTMLImageElement>;

function createTextRenderer(Tag: keyof React.JSX.IntrinsicElements, highlights: HighlightWord[]) {
  return function TextRenderer({ children, ...props }: MarkdownRendererProps) {
    return React.createElement(Tag, props, highlightContent(children, highlights));
  };
}

export function createBoardMarkdownComponents(highlights: HighlightWord[]): Components {
  return {
    p: createTextRenderer("p", highlights),
    li: createTextRenderer("li", highlights),
    h1: createTextRenderer("h1", highlights),
    h2: createTextRenderer("h2", highlights),
    h3: createTextRenderer("h3", highlights),
    blockquote: createTextRenderer("blockquote", highlights),
    code: ({ className, children, ...props }: MarkdownRendererProps) => {
      const match = /language-(\w+)/.exec(className || "");
      const lang = match?.[1];

      if (lang === "mermaid") {
        const chartContent = Array.isArray(children) ? children.join("") : String(children);
        return <MermaidDiagram chart={chartContent.replace(/\n$/, "")} />;
      }

      if (lang) {
        return (
          <pre className="bg-black/30 rounded-lg p-4 my-3 overflow-x-auto text-sm font-mono border border-white/10">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        );
      }

      return (
        <code className="bg-white/10 rounded px-1.5 py-0.5 text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }: MarkdownRendererProps) => <>{children}</>,
    img: ({ src, alt }: ImageRendererProps) => (
      <PhotoView src={typeof src === "string" ? src : ""}>
        <img
          src={typeof src === "string" ? src : ""}
          alt={alt || ""}
          className="mx-auto rounded-lg cursor-zoom-in transition-opacity hover:opacity-90 max-w-full"
        />
      </PhotoView>
    ),
    table: ({ children, ...props }: MarkdownRendererProps) => (
      <div className="overflow-x-auto my-4 border border-white/10 rounded-lg">
        <table className="w-full text-left border-collapse" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: MarkdownRendererProps) => (
      <thead className="bg-white/5 text-gray-300" {...props}>
        {children}
      </thead>
    ),
    tr: ({ children, ...props }: MarkdownRendererProps) => (
      <tr className="border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors" {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }: MarkdownRendererProps) => (
      <th className="p-3 font-semibold" {...props}>
        {highlightContent(children, highlights)}
      </th>
    ),
    td: ({ children, ...props }: MarkdownRendererProps) => (
      <td className="p-3" {...props}>
        {highlightContent(children, highlights)}
      </td>
    ),
  };
}
