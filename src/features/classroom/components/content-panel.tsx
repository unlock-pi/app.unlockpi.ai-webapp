/**
 * Content panel — displays the main text content with word highlights.
 * Uses a dark panel with off-white text, matching Pi AI's dark design.
 * Highlights use warm orange-toned colors.
 */

"use client";

import type { HighlightWord } from "@/features/talk/components/board-panel";

interface HighlightRule {
    type: string;
    color: string;
    style: "highlight" | "underline";
}

interface ContentPanelProps {
    content: string;
    highlights: HighlightWord[];
    rules: HighlightRule[];
}

export function ContentPanel({ content, highlights, rules }: ContentPanelProps) {
    if (!content) {
        return (
            <div className="h-full flex items-center justify-center text-[var(--color-gray)] italic">
                Waiting for instructor content...
            </div>
        );
    }

    // Helper to get style rule for a given word type
    const getStyleForType = (type: string) => {
        return rules.find((r) => r.type === type.toLowerCase());
    };

    // Split content into words and apply matching highlights
    const words = content.split(" ");

    const renderWord = (word: string, key: string) => {
        // Clean word for matching (strip punctuation)
        const cleanWord = word.replace(/[^\w\s]/gi, "").toLowerCase();

        const highlight = highlights.find(
            (h) => h.word.toLowerCase() === cleanWord
        );
        const rule = highlight ? getStyleForType(highlight.type) : null;

        if (rule) {
            const style: React.CSSProperties = {};
            if (rule.style === "highlight") {
                style.backgroundColor = rule.color + "28"; // 16% opacity
                style.borderBottom = `2px solid ${rule.color}`;
            } else if (rule.style === "underline") {
                style.textDecoration = "underline";
                style.textDecorationColor = rule.color;
                style.textDecorationThickness = "2px";
            }

            return (
                <span
                    key={key}
                    style={style}
                    className="rounded px-0.5 mx-0.5 transition-colors duration-300"
                >
                    {word}
                </span>
            );
        }

        return (
            <span key={key} className="mx-1">
                {word}
            </span>
        );
    };

    const { nodes: renderedWords } = words.reduce<{
        nodes: React.ReactNode[];
        offset: number;
    }>(
        (accumulator, word) => {
            const key = `${word}-${accumulator.offset}`;

            return {
                nodes: [...accumulator.nodes, renderWord(word, key)],
                offset: accumulator.offset + word.length + 1,
            };
        },
        { nodes: [], offset: 0 }
    );

    return (
        <div className="bg-[var(--color-darkest-gray)] text-[var(--color-white)] p-8 rounded-xl border border-[var(--color-darker-gray)] min-h-[400px] text-2xl leading-relaxed font-serif">
            {renderedWords}
        </div>
    );
}
