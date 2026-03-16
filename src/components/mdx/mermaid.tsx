"use client";

import { useEffect, useRef, useState } from "react";

let sequence = 0;

interface MdxMermaidProps {
  chart: string;
}

export function MdxMermaid({ chart }: MdxMermaidProps) {
  const idRef = useRef(`mdx-mermaid-${++sequence}`);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg("");
    setError(null);

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          securityLevel: "loose",
          theme: "base",
          themeCSS: `
            .node rect {
              rx: 22px !important;
              ry: 22px !important;
            }
          `,
          themeVariables: {
            primaryColor: "#dc2626",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#dc2626",
            lineColor: "#dc2626",
            textColor: "#ffffff",
            nodeTextColor: "#ffffff",
            clusterBkg: "#7f1d1d",
            clusterBorder: "#dc2626",
            borderRadius: 22,
          },
          flowchart: {
            htmlLabels: true,
          },
        });

        await mermaid.parse(chart);
        const { svg: rendered } = await mermaid.render(idRef.current, chart);

        if (!cancelled) {
          setSvg(rendered);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    }

    render();

    return () => {
      cancelled = true;
      const stale = document.getElementById(idRef.current);
      if (stale) stale.remove();
    };
  }, [chart]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">
        Mermaid render error: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 rounded-lg border border-(--color-darker-gray) bg-(--color-darkest-gray)/70 p-3 text-sm text-gray-300">
        Rendering Mermaid diagram...
      </div>
    );
  }

  return (
    <div
      className="my-4 overflow-x-auto rounded-lg border border-(--color-darker-gray) bg-(--color-darkest-gray)/70 p-3"
    >
      <div
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
