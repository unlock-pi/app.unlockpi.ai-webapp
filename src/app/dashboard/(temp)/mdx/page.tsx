import { MdxMermaid } from "@/components/mdx/mermaid";

export const metadata = {
  title: "MDX Playground",
};

function MdxCallout({ children }: { children: React.ReactNode }) {
  return (
    <aside className="my-5 rounded-lg border border-(--color-darker-gray) bg-(--color-darkest-gray)/80 p-4 text-sm text-gray-200">
      {children}
    </aside>
  );
}

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl py-4">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight text-white">
        MDX Playground
      </h1>

      <p className="mb-3 text-gray-200 leading-7">
        This route is a small content playground for testing markdown-like
        layout, JSX blocks, and shared styles.
      </p>

      <MdxCallout>
        Use this page to verify typography, spacing, and embedded content before
        moving the same patterns into production pages.
      </MdxCallout>

      <section className="grid gap-3">
        <h2 className="mt-8 text-2xl font-semibold tracking-tight text-white">
          Quick Checks
        </h2>
        <ul className="list-disc space-y-1 pl-6 text-gray-200">
          <li>Heading styles are consistent.</li>
          <li>Paragraph and list spacing stays readable.</li>
          <li>Custom JSX components can sit inside the content flow.</li>
        </ul>
      </section>

      <section className="grid gap-3">
        <h2 className="mt-8 text-2xl font-semibold tracking-tight text-white">
          Mermaid Samples
        </h2>

        <MdxMermaid
          chart={`
graph TD
  A[Read Prompt] --> B[Generate Plan]
  B --> C[Render Diagram]
  C --> D[Review Output]
`}
        />

        <MdxMermaid
          chart={`
sequenceDiagram
  Alice->>John: Hello John, how are you?
  John-->>Alice: Great!
  Alice-)John: See you later!
`}
        />
      </section>

      <section className="grid gap-3">
        <h2 className="mt-8 text-2xl font-semibold tracking-tight text-white">
          Table
        </h2>
        <div className="overflow-hidden rounded-lg border border-(--color-darker-gray)">
          <table className="w-full border-collapse text-left text-sm text-gray-200">
            <thead className="bg-(--color-darkest-gray) text-xs uppercase tracking-[0.16em] text-gray-400">
              <tr>
                <th className="border-b border-(--color-darker-gray) px-4 py-3">
                  Feature
                </th>
                <th className="border-b border-(--color-darker-gray) px-4 py-3">
                  Supported
                </th>
                <th className="border-b border-(--color-darker-gray) px-4 py-3">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="odd:bg-white/5">
                <td className="border-b border-(--color-darker-gray) px-4 py-3">
                  Tables
                </td>
                <td className="border-b border-(--color-darker-gray) px-4 py-3">
                  Yes
                </td>
                <td className="border-b border-(--color-darker-gray) px-4 py-3">
                  Full support
                </td>
              </tr>
              <tr className="odd:bg-white/5">
                <td className="border-b border-(--color-darker-gray) px-4 py-3">
                  JSX Blocks
                </td>
                <td className="border-b border-(--color-darker-gray) px-4 py-3">
                  Yes
                </td>
                <td className="border-b border-(--color-darker-gray) px-4 py-3">
                  Use for test content
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
