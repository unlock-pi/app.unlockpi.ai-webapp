import React from "react";
import { PhotoView } from "react-photo-view";
import { highlightContent, HighlightWord } from "@/components/renderers/board-highlight";
import { MermaidDiagram } from "@/components/renderers/mermaid-diagram";
import type { Components } from "react-markdown";

type MarkdownRendererProps = {
  children?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>;

type ImageRendererProps = {
  children?: React.ReactNode;
} & React.ImgHTMLAttributes<HTMLImageElement>;

type LinkRendererProps = {
  children?: React.ReactNode;
  href?: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

function mergeClasses(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function createTextRenderer(
  Tag: keyof React.JSX.IntrinsicElements,
  baseClassName: string,
  highlights: HighlightWord[],
) {
  return function TextRenderer({ children, className, ...props }: MarkdownRendererProps) {
    return React.createElement(
      Tag,
      { ...props, className: mergeClasses(baseClassName, className) },
      highlightContent(children, highlights),
    );
  };
}

export function createBoardMarkdownComponents(highlights: HighlightWord[]): Components {
  return {
    p: createTextRenderer(
      "p",
      "my-3 text-[1.02rem] leading-8 text-gray-100/95",
      highlights,
    ),
    li: createTextRenderer(
      "li",
      "my-1.5 pl-1 text-[0.98rem] leading-7 text-gray-100/90 marker:text-red-300",
      highlights,
    ),
    h1: createTextRenderer(
      "h1",
      "mt-2 mb-5 border-b border-red-500/30 pb-3 text-4xl font-semibold tracking-[-0.03em] text-white text-shadow-light",
      highlights,
    ),
    h2: createTextRenderer(
      "h2",
      "mt-8 mb-3 text-2xl font-semibold tracking-[-0.02em] text-red-100",
      highlights,
    ),
    h3: createTextRenderer(
      "h3",
      "mt-6 mb-2 text-xl font-semibold uppercase tracking-[0.12em] text-gray-300",
      highlights,
    ),
    h4: createTextRenderer(
      "h4",
      "mt-5 mb-2 text-base font-semibold tracking-[0.18em] text-red-200/90",
      highlights,
    ),
    blockquote: ({ children, className, ...props }: MarkdownRendererProps) => (
      <blockquote
        {...props}
        className={mergeClasses(
          "my-5 rounded-r-2xl border-l-4 border-red-500/70 bg-white/[0.04] px-5 py-4 text-gray-100/90 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]",
          className,
        )}
      >
        {highlightContent(children, highlights)}
      </blockquote>
    ),
    ul: ({ children, className, ...props }: MarkdownRendererProps) => (
      <ul
        {...props}
        className={mergeClasses("my-4 list-disc space-y-1 pl-6", className)}
      >
        {children}
      </ul>
    ),
    ol: ({ children, className, ...props }: MarkdownRendererProps) => (
      <ol
        {...props}
        className={mergeClasses("my-4 list-decimal space-y-1 pl-6", className)}
      >
        {children}
      </ol>
    ),
    strong: ({ children, className, ...props }: MarkdownRendererProps) => (
      <strong
        {...props}
        className={mergeClasses("font-semibold text-white", className)}
      >
        {highlightContent(children, highlights)}
      </strong>
    ),
    em: ({ children, className, ...props }: MarkdownRendererProps) => (
      <em
        {...props}
        className={mergeClasses("font-medium text-red-100/95", className)}
      >
        {highlightContent(children, highlights)}
      </em>
    ),
    hr: ({ className, ...props }: MarkdownRendererProps) => (
      <hr
        {...props}
        className={mergeClasses(
          "my-8 h-px border-0 bg-gradient-to-r from-transparent via-red-500/70 to-transparent",
          className,
        )}
      />
    ),
    a: ({ children, href, className, ...props }: LinkRendererProps) => (
      <a
        {...props}
        href={href}
        target="_blank"
        rel="noreferrer"
        className={mergeClasses(
          "font-medium text-red-200 underline decoration-red-500/60 underline-offset-4 transition-colors hover:text-white",
          className,
        )}
      >
        {highlightContent(children, highlights)}
      </a>
    ),
    code: ({ className, children, ...props }: MarkdownRendererProps) => {
      const match = /language-(\w+)/.exec(className || "");
      const lang = match?.[1];

      if (lang === "mermaid") {
        const chartContent = Array.isArray(children) ? children.join("") : String(children);
        return <MermaidDiagram chart={chartContent.replace(/\n$/, "")} />;
      }

      if (lang) {
        return (
          <div className="my-5 overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-red-200/80">
              <span>{lang}</span>
              <span>snippet</span>
            </div>
            <pre className="overflow-x-auto px-4 py-4 text-sm leading-7 text-gray-100">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          </div>
        );
      }

      return (
        <code
          className="rounded-md border border-red-500/25 bg-red-500/10 px-2 py-1 text-[0.92em] font-medium text-red-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
          {...props}
        >
          {highlightContent(children, highlights)}
        </code>
      );
    },
    pre: ({ children }: MarkdownRendererProps) => <>{children}</>,
    img: ({ src, alt }: ImageRendererProps) => (
      <PhotoView src={typeof src === "string" ? src : ""}>
        <img
          src={typeof src === "string" ? src : ""}
          alt={alt || ""}
          className="mx-auto my-5 max-w-full rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.35)] cursor-zoom-in transition-opacity hover:opacity-90"
        />
      </PhotoView>
    ),
    table: ({ children, ...props }: MarkdownRendererProps) => (
      <div className="my-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_14px_44px_rgba(0,0,0,0.2)]">
        <table className="w-full border-collapse text-left text-[0.98rem]" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: MarkdownRendererProps) => (
      <thead className="bg-white/[0.06] text-[0.78rem] uppercase tracking-[0.18em] text-red-100/90" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }: MarkdownRendererProps) => (
      <tbody className="divide-y divide-white/8" {...props}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }: MarkdownRendererProps) => (
      <tr className="transition-colors odd:bg-white/[0.02] hover:bg-white/[0.05]" {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }: MarkdownRendererProps) => (
      <th className="px-4 py-3 font-semibold" {...props}>
        {highlightContent(children, highlights)}
      </th>
    ),
    td: ({ children, ...props }: MarkdownRendererProps) => (
      <td className="px-4 py-3 align-top text-gray-100/92" {...props}>
        {highlightContent(children, highlights)}
      </td>
    ),
  };
}
