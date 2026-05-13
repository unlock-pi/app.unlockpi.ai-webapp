"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useRef } from "react";
import useSound from "use-sound";

export interface CognitiveAnswer {
    text: string;
    percentage: number;
    revealed: boolean;
}

interface CognitiveBoardProps {
    question: string;
    answers: CognitiveAnswer[];
    teamScores: Record<string, number>;
}

export function CognitiveBoard({
    question,
    answers,
    teamScores,
}: CognitiveBoardProps) {
    // Sound Effects
    const [playReveal] = useSound("/reveal.mp3", { volume: 0.5 });

    // Play sound when a card is revealed
    useEffect(() => {
        const justRevealed = answers.some(a => a.revealed);
        if (justRevealed) {
            // checking if strictly a NEW reveal happens involves more state, 
            // but for now simple check is okay or we can rely on parent to trigger
        }
    }, [answers]);

    return (
        <div className="flex flex-col h-full bg-[var(--color-darkest-gray)] rounded-xl border border-[var(--color-darker-gray)] overflow-hidden shadow-2xl relative">

            {/* Header: Question */}
            <div className="bg-[var(--color-orange)] text-white p-6 text-center shadow-lg z-10">
                <h2 className="text-3xl font-bold font-serif tracking-wide uppercase">
                    {question || "Get Ready for the Question..."}
                </h2>
            </div>

            {/* Main Board: Answers Grid */}
            <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center bg-[url('/board-pattern.png')] bg-cover bg-center">
                {/* Fallback if no answers */}
                {answers.length === 0 && (
                    <div className="col-span-2 text-center text-white/50 italic text-xl">
                        Waiting for round to start...
                    </div>
                )}

                {answers.map((ans, idx) => (
                    <AnswerCard key={idx} index={idx} answer={ans} />
                ))}
            </div>

            {/* Footer: Team Scores */}
            <div className="bg-black/40 backdrop-blur-md border-t border-white/10 p-4 grid grid-cols-3 gap-4">
                <TeamScore name="Team Alpha" score={teamScores["Team Alpha"] || 0} color="text-red-400" />
                <TeamScore name="Team Beta" score={teamScores["Team Beta"] || 0} color="text-blue-400" />
                <TeamScore name="Team Gamma" score={teamScores["Team Gamma"] || 0} color="text-green-400" />
            </div>
        </div>
    );
}

function AnswerCard({ index, answer }: { index: number; answer: CognitiveAnswer }) {
    return (
        <div className="h-24 w-full" style={{ perspective: "1000px" }}>
            <motion.div
                className="relative w-full h-full"
                style={{ transformStyle: "preserve-3d" }}
                initial={{ rotateX: 0 }}
                animate={{ rotateX: answer.revealed ? 180 : 0 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
            >
                {/* Front (Hidden) */}
                <div
                    className="absolute inset-0 bg-gradient-to-b from-blue-900 to-blue-800 border-2 border-white/20 rounded-lg flex items-center justify-center shadow-[0_4px_0_#1e3a8a]"
                    style={{ backfaceVisibility: "hidden", transform: "rotateX(0deg)" }}
                >
                    <div className="w-[90%] h-[80%] border-2 border-dashed border-blue-400/30 rounded-full flex items-center justify-center">
                        <span className="text-4xl font-bold text-blue-200/50 drop-shadow-lg">
                            {index + 1}
                        </span>
                    </div>
                </div>

                {/* Back (Revealed) */}
                <div
                    className="absolute inset-0 bg-gradient-to-b from-white to-gray-200 border-2 border-white rounded-lg flex items-center justify-between px-8 shadow-[0_4px_0_#9ca3af]"
                    style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
                >
                    <span className="text-2xl font-bold text-gray-900 uppercase">
                        {answer.text}
                    </span>
                    <div className="bg-black text-white font-mono text-2xl font-bold px-3 py-1 border-2 border-gray-600 shadow-inner">
                        {answer.percentage}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function TeamScore({ name, score, color }: { name: string; score: number; color: string }) {
    return (
        <div className="flex flex-col items-center justify-center bg-white/5 rounded-lg p-2 border border-white/5">
            <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>
                {name}
            </span>
            <span className="text-3xl font-[var(--font-mono)] font-bold text-white mt-1">
                {score}
            </span>
        </div>
    );
}
