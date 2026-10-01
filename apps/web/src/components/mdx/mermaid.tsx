"use client";

import { useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

let sequence = 0;

/**
 * Loosely evokes a flowchart (node -> decision -> two branches) rather than a
 * generic loading block, since we don't know the real chart's shape until
 * mermaid finishes parsing it.
 */
function MermaidSkeleton() {
  return (
    <div
      role="status"
      aria-label="Rendering diagram"
      className="my-4 flex flex-col items-center gap-2 rounded-lg border border-(--color-darker-gray) bg-(--color-darkest-gray)/70 p-6"
    >
      <Skeleton className="h-9 w-28 rounded-lg" />
      <Skeleton className="h-4 w-px" />
      <Skeleton className="h-9 w-36 rounded-lg" />
      <div className="flex gap-10">
        <Skeleton className="h-4 w-px" />
        <Skeleton className="h-4 w-px" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  );
}

interface MdxMermaidProps {
  chart: string;
  /**
   * CSS font-family value baked into the rendered SVG's text via mermaid's
   * `themeVariables.fontFamily`. Mermaid ignores ambient page CSS for its
   * text — it bakes font-family into the SVG at render time — so a caller
   * that wants diagrams to follow a surrounding typeface (e.g. the canvas's
   * selected typeface) must pass it explicitly. Omitted = mermaid's own
   * default, unchanged for callers outside that context (blog/MDX pages).
   */
  fontFamily?: string;
}

export function MdxMermaid({ chart, fontFamily }: MdxMermaidProps) {
  const idRef = useRef(`mdx-mermaid-${++sequence}`);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  // TEMP DIAGNOSTIC — remove alongside the logs below.
  const previousChartRef = useRef<string | null>(null);
  const renderCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setSvg("");
    setError(null);

    // TEMP DIAGNOSTIC — remove once the repeated-render report is resolved.
    // Exact equality against the last chart this same instance saw, since a
    // truncated preview can't rule out a difference past character 40.
    renderCountRef.current += 1;
    const identicalToPrevious = previousChartRef.current === chart;
    let firstDiffIndex = -1;
    if (previousChartRef.current !== null && !identicalToPrevious) {
      const prev = previousChartRef.current;
      const maxLen = Math.max(prev.length, chart.length);
      for (let i = 0; i < maxLen; i++) {
        if (prev[i] !== chart[i]) {
          firstDiffIndex = i;
          break;
        }
      }
    }
    console.log("[mermaid] effect fired", {
      instanceId: idRef.current,
      firingNumber: renderCountRef.current,
      chartLength: chart.length,
      identicalToPreviousChart: previousChartRef.current === null ? "n/a (first firing)" : identicalToPrevious,
      firstDiffIndex,
      contextAroundDiff:
        firstDiffIndex >= 0
          ? {
              previous: previousChartRef.current?.slice(
                Math.max(0, firstDiffIndex - 15),
                firstDiffIndex + 15,
              ),
              current: chart.slice(Math.max(0, firstDiffIndex - 15), firstDiffIndex + 15),
            }
          : undefined,
    });
    previousChartRef.current = chart;

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
            ...(fontFamily ? { fontFamily } : {}),
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
      // TEMP DIAGNOSTIC — remove alongside the log above.
      console.log("[mermaid] effect cleanup", { instanceId: idRef.current });
      const stale = document.getElementById(idRef.current);
      if (stale) stale.remove();
    };
  }, [chart, fontFamily]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">
        Mermaid render error: {error}
      </div>
    );
  }

  if (!svg) {
    return <MermaidSkeleton />;
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
