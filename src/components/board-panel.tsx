"use client";

/**
 * BoardPanel — Rich markdown-powered classroom board.
 *
 * Renders agent content as Markdown with support for:
 *  - Tables (GFM), checklists, bold/italic/headings
 *  - Math formulas (KaTeX)
 *  - Mermaid diagrams (rendered via mermaid.js)
 *  - Word-level highlighting (works inside tables, lists, etc.)
 *  - Scrollable container with subtle scrollbar
 *  - Motion animations on content transitions
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────

export interface HighlightRule {
    color: string;
    style: "highlight" | "underline";
}

export interface HighlightWord {
    word: string;
    type: string;
    positions?: number[];
}

interface BoardPanelProps {
    content: string;
    highlights: HighlightWord[];
    className?: string;
}

// ── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_RED = "#DC2626";
const SECONDARY_BLUE = "#0364CE";

const STYLE_MAP: Record<string, HighlightRule> = {
    // Red styles (Primary)
    highlight: { color: DEFAULT_RED, style: "highlight" },
    underline: { color: DEFAULT_RED, style: "underline" },
    noun: { color: DEFAULT_RED, style: "highlight" },
    verb: { color: DEFAULT_RED, style: "underline" },
    // Blue styles (Secondary)
    secondary: { color: SECONDARY_BLUE, style: "highlight" },
    "secondary-underline": { color: SECONDARY_BLUE, style: "underline" },
    concept: { color: SECONDARY_BLUE, style: "highlight" },
    blue: { color: SECONDARY_BLUE, style: "highlight" },
};

const FALLBACK_STYLE: HighlightRule = { color: "#facc15", style: "highlight" };

// ── Mermaid Diagram Component ───────────────────────────────────────────────

// Deterministic counter for Mermaid diagram IDs (avoids Math.random hydration mismatch)
let mermaidIdCounter = 0;

/**
 * Renders a Mermaid diagram from source code string.
 * Uses mermaid.js (dynamic import) to parse and render SVG.
 * Gracefully handles syntax errors by validating with mermaid.parse() first,
 * and displays a styled fallback with the raw code on failure.
 */
function MermaidDiagram({ chart }: { chart: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    // Generate a unique ID per render cycle to avoid stale DOM element conflicts
    const idRef = useRef(`mermaid-${++mermaidIdCounter}`);

    // Ensure we're on the client side
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return; // Don't run on server side

        let cancelled = false;
        // Reset state on new chart input
        setSvg("");
        setError(null);
        // Fresh ID for each render attempt to prevent mermaid ID collisions
        idRef.current = `mermaid-${++mermaidIdCounter}`;

        async function render() {
            // Clean up the code to remove common LLM formatting errors (like nested code blocks and HTML entities)
            let trimmedChart = chart
                .replace(/&gt;/g, ">")
                .replace(/&lt;/g, "<")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .trim();

            // Remove code block markers (handle multiple formats)
            // Remove opening markers (```mermaid or just ```)
            trimmedChart = trimmedChart.replace(/^```(?:mermaid)?\s*\n?/, "");
            // Remove closing markers
            trimmedChart = trimmedChart.replace(/\n?```\s*$/, "");
            // Final trim
            trimmedChart = trimmedChart.trim();

            if (!trimmedChart) {
                if (!cancelled) setError("Empty diagram code.");
                return;
            }

            try {
                // Dynamic import to avoid SSR issues
                const mermaid = (await import("mermaid")).default;

                // Initialize mermaid with dark theme
                mermaid.initialize({
                    startOnLoad: false,
                    suppressErrorRendering: true, // Don't inject error SVGs into the DOM
                    theme: "dark",
                    securityLevel: "loose", // Allow more flexible syntax
                    themeVariables: {
                        darkMode: true,
                        background: "#1a1a1a",
                        primaryColor: "#DC2626",
                        primaryTextColor: "#ffffff",
                        primaryBorderColor: "#DC2626",
                        lineColor: "#666666",
                        secondaryColor: "#0364CE",
                        tertiaryColor: "#333333",
                        fontSize: "16px",
                    },
                    flowchart: {
                        htmlLabels: true,
                        curve: "basis",
                    },
                });

                // Validate syntax before attempting render to catch errors early
                try {
                    await mermaid.parse(trimmedChart);
                } catch (parseErr: any) {
                    const msg = parseErr?.message || parseErr?.str || String(parseErr);
                    console.error("[Mermaid] Syntax error in diagram:", msg);
                    console.error("[Mermaid] Problematic code:", trimmedChart);
                    if (!cancelled) setError(`Syntax error: ${msg}`);
                    return;
                }

                // Clean up any stale DOM element from a previous failed render with same ID
                const staleEl = document.getElementById(idRef.current);
                if (staleEl) staleEl.remove();

                // Wait for next tick to ensure DOM is ready
                await new Promise(resolve => setTimeout(resolve, 0));

                // Double check we weren't cancelled during the delay
                if (cancelled) return;

                // Render using mermaid.render with the ID
                const { svg: renderedSvg } = await mermaid.render(
                    idRef.current,
                    trimmedChart
                );

                if (!cancelled) {
                    console.log("[Mermaid] Successfully rendered diagram");
                    setSvg(renderedSvg);

                    // Clean up the temporary element that mermaid creates
                    const tempEl = document.getElementById(idRef.current);
                    if (tempEl) tempEl.remove();
                }
            } catch (err: any) {
                const msg = err?.message || String(err);
                console.error("[Mermaid] Failed to render diagram:", msg);
                console.error("[Mermaid] Chart code:", trimmedChart);
                // Clean up any broken element mermaid may have left in the DOM
                const brokenEl = document.getElementById(idRef.current);
                if (brokenEl) brokenEl.remove();
                if (!cancelled) setError(`Render error: ${msg}`);
            }
        }

        render();
        return () => {
            cancelled = true;
            // Clean up any leftover DOM elements
            const tempEl = document.getElementById(idRef.current);
            if (tempEl) tempEl.remove();
        };
    }, [chart, isClient]);

    // Error fallback — show the raw diagram code in a styled box
    if (error) {
        return (
            <div className="my-4 rounded-lg border border-red-500/30 bg-red-950/20 p-4 text-sm">
                <p className="text-red-400 font-medium mb-2 flex items-center gap-2">
                    <span>⚠️</span> Diagram could not be rendered
                </p>
                <p className="text-red-300 text-xs mb-3 font-mono bg-red-950/30 rounded p-2 border border-red-500/20">
                    {error}
                </p>
                <details className="text-xs">
                    <summary className="text-gray-400 cursor-pointer hover:text-gray-300 mb-2">
                        Show diagram code
                    </summary>
                    <pre className="text-gray-400 text-xs whitespace-pre-wrap overflow-x-auto bg-black/30 rounded p-3 border border-white/5 mt-2">
                        {chart.trim()}
                    </pre>
                </details>
            </div>
        );
    }

    // Loading state
    if (!isClient || !svg) {
        return (
            <div className="my-4 flex justify-center items-center min-h-[200px] text-gray-400">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Rendering diagram...</span>
                </div>
            </div>
        );
    }

    // Success state - render the SVG
    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="my-4 flex justify-center overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

// ── Helper: Recursive Text Highlighting ─────────────────────────────────────

/**
 * Recursively processes React nodes to find string leaves and apply highlights.
 * Works inside tables, lists, bold, italic — any nested markdown element.
 */
function highlightContent(
    children: React.ReactNode,
    highlights: HighlightWord[]
): React.ReactNode {
    if (typeof children === "string") {
        return splitTextOnHighlights(children, highlights);
    }

    if (Array.isArray(children)) {
        return children.map((child, i) => (
            <React.Fragment key={i}>
                {highlightContent(child, highlights)}
            </React.Fragment>
        ));
    }

    if (React.isValidElement(children)) {
        const element = children as React.ReactElement<any>;
        if (element.props.children) {
            return React.cloneElement(element, {
                ...element.props,
                children: highlightContent(element.props.children, highlights),
            });
        }
    }

    return children;
}

function splitTextOnHighlights(
    text: string,
    highlights: HighlightWord[]
): React.ReactNode {
    if (!highlights.length || !text) return text;

    const pattern = new RegExp(
        `(${highlights.map((h) => escapeRegExp(h.word)).join("|")})`,
        "gi"
    );

    const parts = text.split(pattern);

    return parts.map((part, i) => {
        const lowerPart = part.toLowerCase();
        const match = highlights.find(
            (h) => h.word.toLowerCase() === lowerPart
        );

        if (match) {
            const rule =
                STYLE_MAP[match.type.toLowerCase()] || FALLBACK_STYLE;
            const style: React.CSSProperties =
                rule.style === "highlight"
                    ? {
                        backgroundColor: `${rule.color}28`,
                        borderBottom: `2px solid ${rule.color}`,
                    }
                    : {
                        textDecoration: "underline",
                        textDecorationColor: rule.color,
                        textDecorationThickness: "2px",
                    };

            return (
                <motion.span
                    key={i}
                    initial={{ backgroundColor: "transparent" }}
                    animate={{ backgroundColor: style.backgroundColor }}
                    style={style}
                    className="rounded px-0.5 mx-0.5 inline-block"
                >
                    {part}
                </motion.span>
            );
        }

        return part;
    });
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Component ───────────────────────────────────────────────────────────────

export function BoardPanel({ content, highlights, className }: BoardPanelProps) {
    const components = useMemo(() => {
        // Generic renderer that applies highlighting to children text nodes
        const createRenderer =
            (Tag: any) =>
                ({ children, ...props }: any) => (
                    <Tag {...props}>
                        {highlightContent(children, highlights)}
                    </Tag>
                );

        return {
            p: createRenderer("p"),
            li: createRenderer("li"),
            h1: createRenderer("h1"),
            h2: createRenderer("h2"),
            h3: createRenderer("h3"),
            blockquote: createRenderer("blockquote"),
            // Mermaid + code block handling
            code: ({ className: codeClassName, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(codeClassName || "");
                const lang = match?.[1];

                // Mermaid diagrams
                if (lang === "mermaid") {
                    // Extract chart content more robustly - handle arrays, strings, etc.
                    const chartContent = Array.isArray(children)
                        ? children.join("")
                        : String(children);
                    return (
                        <MermaidDiagram chart={chartContent.replace(/\n$/, "")} />
                    );
                }

                // Block code (has language class)
                if (lang) {
                    return (
                        <pre className="bg-black/30 rounded-lg p-4 my-3 overflow-x-auto text-sm font-mono border border-white/10">
                            <code className={codeClassName} {...props}>
                                {children}
                            </code>
                        </pre>
                    );
                }

                // Inline code
                return (
                    <code
                        className="bg-white/10 rounded px-1.5 py-0.5 text-sm font-mono"
                        {...props}
                    >
                        {children}
                    </code>
                );
            },
            // pre tag — pass through (code block handles wrapping)
            pre: ({ children }: any) => <>{children}</>,
            // Custom table styling
            table: ({ children, ...props }: any) => (
                <div className="overflow-x-auto my-4 border border-white/10 rounded-lg">
                    <table
                        className="w-full text-left border-collapse"
                        {...props}
                    >
                        {children}
                    </table>
                </div>
            ),
            thead: ({ children, ...props }: any) => (
                <thead
                    className="bg-white/5 text-gray-300"
                    {...props}
                >
                    {children}
                </thead>
            ),
            tr: ({ children, ...props }: any) => (
                <tr
                    className="border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors"
                    {...props}
                >
                    {children}
                </tr>
            ),
            th: ({ children, ...props }: any) => (
                <th className="p-3 font-semibold" {...props}>
                    {highlightContent(children, highlights)}
                </th>
            ),
            td: ({ children, ...props }: any) => (
                <td className="p-3" {...props}>
                    {highlightContent(children, highlights)}
                </td>
            ),
        };
    }, [highlights]);

    return (
        <div
            className={cn(
                "w-full max-w-3xl p-6 rounded-xl relative bg-amber-200 z-10",
                "bg-[var(--color-darkest-gray)] border border-[var(--color-darker-gray)]",
                "text-white text-lg leading-relaxed shadow-xl",
                // Scrollable with subtle scrollbar
                "min-h-96 overflow-y-auto",
                // "[&::-webkit-scrollbar]:w-1.5",
                // "[&::-webkit-scrollbar-track]:bg-transparent",
                // "[&::-webkit-scrollbar-thumb]:bg-white/10",
                // "[&::-webkit-scrollbar-thumb]:rounded-full",
                // "[&::-webkit-scrollbar-thumb:hover]:bg-white/20",
                className
            )}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={content.slice(0, 50)} // Unique key triggers animation on major content changes
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-gray-300 prose-strong:text-white"
                >
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={components as any}
                    >
                        {content || "*Board is empty...*"}
                    </ReactMarkdown>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
