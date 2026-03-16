"use client";

import { MdxMermaid } from "@/components/mdx/mermaid";

export function MermaidDiagram({ chart }: { chart: string }) {
  const cleanedChart = normalizeMermaidChart(chart);
  return <MdxMermaid chart={cleanedChart} />;
}

function normalizeMermaidChart(chart: string): string {
  let cleanedChart = chart
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

  cleanedChart = cleanedChart.replace(/^```(?:mermaid)?\s*\n?/, "");
  cleanedChart = cleanedChart.replace(/\n?```\s*$/, "");
  cleanedChart = cleanedChart.trim();
  cleanedChart = cleanedChart.replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex: string) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  cleanedChart = cleanedChart.replace(/\u00a0/g, " ");
  cleanedChart = cleanedChart.replace(/≠/g, "!=");
  cleanedChart = cleanedChart.replace(/([A-Za-z0-9_]+)\[([^\]"]+)\]/g, (match, nodeId, label) => {
    if (/[()[\]{}]/.test(label)) {
      return `${nodeId}["${label.replace(/"/g, '\\"')}"]`;
    }

    return match;
  });

  return cleanedChart;
}
