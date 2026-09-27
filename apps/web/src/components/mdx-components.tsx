import type { MDXComponents } from "mdx/types";
import { MdxMermaid } from "@/components/mdx/mermaid";

function MdxCallout({ children }: { children: React.ReactNode }) {
  return (
    <aside className="my-5 rounded-lg border border-(--color-darker-gray) bg-(--color-darkest-gray)/80 p-4 text-sm text-gray-200">
      {children}
    </aside>
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => <h1 className="text-3xl font-semibold tracking-tight text-white mb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-2xl font-semibold tracking-tight text-white mt-8 mb-3">{children}</h2>,
    p: ({ children }) => <p className="text-gray-200 leading-7 mb-3">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-6 text-gray-200 space-y-1 mb-4">{children}</ul>,
    code: ({ children }) => <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-white">{children}</code>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-(--color-orange) pl-4 italic text-gray-300 my-4">{children}</blockquote>
    ),
    Mermaid: MdxMermaid,
    MdxCallout,
    ...components,
  };
}
