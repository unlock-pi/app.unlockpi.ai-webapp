/**
 * Landing page for UnlockPi — Pi Tutor classroom AI.
 * Styled with the Pi AI dark + orange design language.
 * Featuring a high-fidelity "AI Brain" matrix animation.
 */

"use client";

import { useRouter } from "next/navigation";
import { Matrix } from "@/components/ui/matrix";
import { Button } from "@/components/ui/button";

export default function HomePage() {
    const router = useRouter();


    return (
        <div className="min-h-screen bg-[var(--color-black)] text-[var(--color-white)] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Animated background gradient orbs — orange-tinted */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[rgba(220,38,38,0.08)] rounded-full blur-[128px] animate-pulse" />
                <div
                    className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[rgba(220,38,38,0.05)] rounded-full blur-[128px] animate-pulse"
                    style={{ animationDelay: "1s" }}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[rgba(220,38,38,0.04)] rounded-full blur-[200px]" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-3xl">
                {/* Logo / Brand */}
                <div className="flex items-center gap-3 mb-6 animate-fade-in-down">
                    <img
                        src="/unlockpi-logo.png"
                        alt="UnlockPi Logo"
                        className="h-20 w-auto object-contain drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                    />
                </div>

                {/* 
            Matrix Animation "AI Brain"
            High-density 28x15 grid with a complex flowing wave pattern.
            Inspired by ElevenLabs / sci-fi AI interfaces. 
        */}
                <div className="relative group">
                    {/* Glow effect behind the matrix */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-[var(--color-orange)]/10 to-transparent blur-xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity duration-1000" />

                    <div className="relative p-6 rounded-2xl bg-[var(--color-darkest-gray)]/50 border border-[var(--color-darker-gray)] backdrop-blur-sm shadow-2xl shadow-black/50">
                        <Matrix
                            rows={15}
                            cols={28}
                            size={6}  // Smaller dots for higher density
                            gap={3}   // Tighter spacing
                            frames={heroFrames}
                            fps={30}  // Smoother animation
                            loop
                            ariaLabel="AI Neural Pulse Animation"
                            palette={{
                                on: "var(--color-orange)",
                                off: "var(--color-dark-gray)"
                            }}
                            className="opacity-90"
                        />
                    </div>
                </div>

                {/* Tagline */}
                <p className="text-[var(--color-gray)] text-lg leading-relaxed max-w-md mt-4">
                    Your AI-powered classroom assistant. Making learning fun, interactive,
                    and unforgettable.
                </p>


                {/* Join Classroom Button */}
                {/* <Button
                    className="group relative px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300
                    bg-[var(--color-orange)] text-white
                    hover:shadow-[0_0_40px_rgba(220,38,38,0.4)]
                    hover:brightness-110
                    active:scale-[0.98]
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <span className="flex items-center gap-3">
                        {isJoining ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                Join Classroom
                                <svg
                                    className="w-5 h-5 transition-transform group-hover:translate-x-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                                    />
                                </svg>
                            </>
                        )}
                    </span>
                </Button> */}

                {/* Talk-only route */}
                <Button
                    onClick={() => router.push("/dashboard/talk")}
                    className="group relative px-10 py-7 rounded-2xl font-semibold text-lg transition-all duration-300
                    bg-[var(--color-orange)] text-white
                    hover:shadow-[0_0_40px_rgba(220,38,38,0.4)]
                    hover:brightness-110
                    active:scale-[0.98]
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <span className="flex items-center gap-2">
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                            />
                        </svg>
                        Just Talk to Pi
                    </span>
                </Button>

                {/* Footer Info */}
                <div className="mt-8 flex items-center justify-center gap-4 text-xs text-[var(--color-dark-gray)] font-[var(--font-mono)]">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-orange)] animate-pulse" />
                        Room: Classroom 101
                    </span>
                    <span>•</span>
                    <span>Subject: Science</span>
                    <span>•</span>
                    <span>Instructor: Faizan Sir</span>
                </div>
            </div>

            <footer className="absolute bottom-6 text-[var(--color-dark-gray)] text-xs font-[var(--font-mono)] opacity-50">
                Powered by LiveKit • Built with Next.js
            </footer>
        </div>
    );
}

/** Small feature card — dark panel with orange hover accent */
function FeatureCard({
    icon,
    label,
    description,
}: {
    icon: string;
    label: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--color-darkest-gray)] border border-[var(--color-darker-gray)] hover:border-[var(--color-orange)]/40 hover:bg-[var(--color-darker-gray)]/80 transition-all duration-300 hover:-translate-y-1">
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-medium text-[var(--color-lighter-gray)]">
                {label}
            </span>
            <span className="text-xs text-[var(--color-gray)]">{description}</span>
        </div>
    );
}

/** 
 * IIFE to generate the "Neural Pulse" wave animation frames.
 * Creates a complex, organic flowing wave pattern using sine superposition.
 */
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
                // Wave 3: Vertical oscillation
                const w3 = Math.sin(t * 2);

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