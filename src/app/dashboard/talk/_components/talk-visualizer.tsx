"use client";

import { motion } from "motion/react";
import { Matrix, pulse } from "@/components/ui/matrix";
import { BoardPanel } from "@/components/board-panel";
import { useAudioAnalyzer } from "@/hooks/use-audio-analyzer";
import { TrackReferenceOrPlaceholder } from "@livekit/components-react";

interface TalkVisualizerProps {
    state: string;
    isLive: boolean;
    audioTrack?: TrackReferenceOrPlaceholder;
    micTrackRef?: TrackReferenceOrPlaceholder;
    liveAgentText: string | null;
    boardText: string;
    boardHighlights: any[];
}

export function TalkVisualizer({
    state,
    isLive,
    audioTrack,
    micTrackRef,
    liveAgentText,
    boardText,
    boardHighlights,
}: TalkVisualizerProps) {
    // ── Audio analysis for VU matrix ─────────────────────────────────────
    const agentLevels = useAudioAnalyzer(audioTrack, 64);
    const micLevels = useAudioAnalyzer(micTrackRef, 64);

    const isAgentSpeaking = state === "speaking";
    const isListening = state === "listening" || state === "idle";
    const isThinking = state === "thinking";

    // VU levels for the dotted bar matrix (same beeping effect as before)
    // User speaking -> Reverse levels so it flows from Right to Left
    const activeLevels =
        isAgentSpeaking ? agentLevels.slice(0, 28) :
            isListening ? micLevels.slice(0, 28).reverse() :
                new Array(28).fill(0);

    const stateLabels: Record<string, string> = {
        disconnected: "Disconnected",
        connecting: "Connecting...",
        initializing: "Initializing...",
        idle: "Listening",
        listening: "Listening...",
        thinking: "Thinking...",
        speaking: "Speaking...",
    };

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-7xl gap-8 relative z-10 min-h-0">


            <section className="flex flex-row-reverse items-center gap-10">
                {/* ── Matrix Visualizer ── */}
                <div className="relative group flex-shrink-0">
                    {/* Glow effect behind matrix */}
                    <div
                        className="absolute -inset-4 bg-gradient-to-r from-[var(--color-orange)]/10 to-transparent blur-xl rounded-full transition-opacity duration-700 pointer-events-none"
                        style={{ opacity: isAgentSpeaking ? 0.6 : isThinking ? 0.4 : isListening ? 0.3 : 0.15 }}
                    />

                    <div className="relative rounded-2xl bg-[var(--color-darkest-gray)]/50 border border-[var(--color-darker-gray)] backdrop-blur-sm shadow-2xl shadow-black/50 transition-all duration-500">
                        <Matrix
                            rows={15}
                            cols={28}
                            size={6}
                            gap={3}
                            {...(isLive
                                ? isThinking
                                    // Thinking → animated pulse pattern
                                    ? { frames: pulse, fps: 12, loop: true }
                                    // Speaking/Listening → VU dotted bar equalizer
                                    : { mode: "vu" as const, levels: activeLevels }
                                // Disconnected → hero neural pulse (same as homepage)
                                : { frames: heroFrames, fps: 30, loop: true })}
                            palette={{
                                on: "var(--color-orange)",
                                off: "var(--color-dark-gray)",
                            }}
                            className="opacity-90"
                            ariaLabel="Voice Visualizer"
                        />
                    </div>
                </div>
                {/* ── Top: Logo + Status ── */}
                <div className="flex flex-col items-center gap-1 relative z-10 flex-shrink-0">
                    <div className="relative">
                        {/* Glow behind logo when AI speaking */}
                        <div
                            className="absolute -inset-4 bg-[var(--color-orange)]/20 blur-xl rounded-full transition-all duration-500 pointer-events-none"
                            style={{
                                opacity: isAgentSpeaking ? 1 : 0,
                                transform: isAgentSpeaking ? "scale(1)" : "scale(0.5)",
                            }}
                        />
                        <img
                            src="/unlockpi-logo.png"
                            alt="UnlockPi Logo"
                            className="h-14 w-auto object-contain relative z-10 drop-shadow-2xl"
                        />
                    </div>
                    <h2 className="text-white text-xl font-bold tracking-tight">UnlockPi</h2>
                    <p className="text-[var(--color-gray)] text-xs tracking-wider flex items-center gap-1.5">
                        <span
                            className={`rounded-full w-2 h-2 inline-block ${isLive ? "bg-green-400 animate-pulse" : "bg-[var(--color-dark-gray)]"
                                }`}
                        />
                        {isLive ? stateLabels[state] || state : "Offline"}
                    </p>
                </div>
            </section>

            {/* ── Live transcript (Immediate) — DISABLED: duplicated by TalkTranscript panel at the bottom ── */}
            {/* {isLive && liveAgentText && (
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[var(--color-gray)] text-lg max-w-4xl text-center font-medium leading-relaxed drop-shadow-md"
                >
                    {liveAgentText}
                </motion.div>
            )} */}

            {/* ── Board Text (rich markdown board) ── */}
            {boardText && (
                <BoardPanel
                    content={boardText}
                    highlights={boardHighlights}
                    className="w-full max-w-5xl "
                />
            )}

        </div>
    );
}

const heroFrames = (() => {
    const frames: number[][][] = [];
    const rows = 15;
    const cols = 28;
    const frameCount = 60; // 2 seconds loop at 30fps

    for (let f = 0; f < frameCount; f++) {
        const frame: number[][] = [];
        const t = (f / frameCount) * Math.PI * 2;

        for (let r = 0; r < rows; r++) {
            const rowArr: number[] = [];
            const normalizedY = r / (rows - 1); // 0 to 1

            for (let c = 0; c < cols; c++) {
                const normalizedX = c / (cols - 1); // 0 to 1

                // Complex wave function combining multiple frequencies
                // Wave 1: Main flowing wave
                const w1 = Math.sin(normalizedX * Math.PI * 2 + t);
                // Wave 2: Opposing faster wave
                const w2 = Math.cos(normalizedX * Math.PI * 4 - t * 1.5);
                // Wave 3: Vertical oscillation (unused in calc but part of the aesthetic)
                // const w3 = Math.sin(t * 2);

                // Calculate the "active zone" (center of the energy beam)
                // It moves vertically based on the waves
                const center = 0.5 + (w1 * 0.2 + w2 * 0.1) * Math.sin(normalizedX * Math.PI);

                // Calculate distance of this pixel from the active zone
                const dist = Math.abs(normalizedY - center);

                // Intensity falls off with distance from center
                // Sharper falloff = thinner line
                let intensity = 1 - Math.pow(dist * 3.5, 1.5);

                // Add some "sparkle" or noise at the edges
                if (Math.random() > 0.98) intensity += 0.3;

                // Clamp
                intensity = Math.max(0, Math.min(1, intensity));

                rowArr.push(intensity);
            }
            frame.push(rowArr);
        }
        frames.push(frame);
    }
    return frames;
})();
