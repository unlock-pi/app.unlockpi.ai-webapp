"use client";
import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
import { mermaid } from '@streamdown/mermaid';
import { math } from '@streamdown/math';
import { cjk } from '@streamdown/cjk';
// Import KaTeX styles for math rendering
import 'katex/dist/katex.min.css';




export default function Page() {
    const markdown = `
# Hello World
Here's **some code**:
| Name | Description | Status |
|------|-------------|--------|
| **Streamdown** | A react-markdown replacement | ✅ Active |
| *Feature X* | Under development | 🚧 WIP |
| ~~Old Package~~ | Deprecated | ❌ Removed |
\`\`\`typescript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`
And a diagram:
\`\`\`mermaid
graph TD
    A[Start] --> B(Stop)
    style A fill:#f9f,stroke:#333,stroke-width:4px
    style B fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5


\`\`\`

<Highlight color="red-200">Hello World</Highlight>

![alt text](https://avatars.githubusercontent.com/u/79694828?v=4)
![alt text](https://dt5lkwp0nd.ufs.sh/f/hNfKtmQJ2ATyaIHC4WnvgPcTKej6EmsGL1IBNthSCAHz8JZ3)
![alt text](https://dt5lkwp0nd.ufs.sh/f/hNfKtmQJ2ATyLvg0MYwHO1bcZKz5rnBkMDdivVgjEF0lR78C)
And some math: $$E = mc^2$$
  `;


    return (
        <Streamdown
            // rehypePlugins={[require('rehype-raw')]}

            controls={
                {
                    code: false
                }
            }
            className='max-w-2xl mx-auto py-10'
            mode='static'
            plugins={{
                code: code,
                mermaid: mermaid,
                math: math,
                cjk: cjk,
            }}
            components={{
                // strong: ({ children }: { children: React.ReactNode }) => (
                //     <span className="bg-red-500 text-white">
                //         {children}
                //     </span>
                // ),
                // p: ({ children }) => (
                //     <p className=" leading-relaxed text-gray-700 -text-blue-500">
                //         {children}
                //     </p>
                // ),
                // h2: ({ children }) => (
                //     <h2 className="text-3xl font-semibold text-blue-500">
                //         {children}
                //     </h2>
                // ),
                // p2: ({ children }: { children: React.ReactNode }) => (
                //     <p className="text-gray-700 leading-relaxed">
                //         {children}
                //     </p>
                // ),
            }}
        >
            {markdown}
        </Streamdown>
    );
}

// Maps Tailwind-style color names (e.g. "red-200") to real CSS hex values.
// Inline styles require actual CSS colors — Tailwind class names are meaningless to the browser.
// Add more entries here as needed.
const TAILWIND_COLORS: Record<string, string> = {
    'red-100': '#fee2e2', 'red-200': '#fecaca', 'red-300': '#fca5a5',
    'orange-100': '#ffedd5', 'orange-200': '#fed7aa', 'orange-300': '#fdba74',
    'yellow-100': '#fef9c3', 'yellow-200': '#fef08a', 'yellow-300': '#fde047',
    'green-100': '#dcfce7', 'green-200': '#bbf7d0', 'green-300': '#86efac',
    'blue-100': '#dbeafe', 'blue-200': '#bfdbfe', 'blue-300': '#93c5fd',
    'purple-100': '#f3e8ff', 'purple-200': '#e9d5ff', 'purple-300': '#d8b4fe',
    'pink-100': '#fce7f3', 'pink-200': '#fbcfe8', 'pink-300': '#f9a8d4',
};

// Highlight component used as a custom renderer inside Streamdown.
// Accepts a `color` prop as either a Tailwind color name (e.g. "red-200") or
// a raw CSS color value (e.g. "#ff0000"). Falls back to a soft blue default.
const Highlight = ({ children, color }: Record<string, unknown> & { children?: React.ReactNode; color?: string }) => {
    // Resolve Tailwind name → hex, or use the value as-is if it's already a CSS color
    const bgColor = (color && TAILWIND_COLORS[color]) || color || '#bfdbfe';
    return (
        <span style={{ backgroundColor: bgColor, borderRadius: '3px', padding: '0 3px' }}>
            {children}
        </span>
    );
};