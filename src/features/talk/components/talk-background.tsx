"use client";

interface TalkBackgroundProps {
    state: string;
}

export function TalkBackground({ state }: TalkBackgroundProps) {
    const isAgentSpeaking = state === "speaking";
    const isListening = state === "listening" || state === "idle";
    const isThinking = state === "thinking";

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Central ambient - Throb when Thinking */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-orange)] rounded-full blur-[200px] transition-all duration-1000"
                style={{
                    opacity: isThinking ? 0.3 : isAgentSpeaking ? 0.15 : 0.05,
                    transform: isThinking ? "scale(1.1)" : "scale(1)"
                }}
            />
            {/* Left orb — glows when AI speaks (source is left) */}
            <div
                className="absolute top-1/3 -left-32 w-96 h-96 bg-[rgba(220,38,38,0.15)] rounded-full blur-[128px] transition-all duration-500"
                style={{
                    opacity: isAgentSpeaking ? 1 : 0.1,
                    transform: isAgentSpeaking ? "scale(1.4)" : "scale(0.8)",
                }}
            />
            {/* Right orb — glows when user speaks (source is right) */}
            <div
                className="absolute bottom-1/3 -right-32 w-96 h-96 bg-[rgba(3,100,206,0.15)] rounded-full blur-[128px] transition-all duration-500"
                style={{
                    opacity: isListening ? 1 : 0.1,
                    transform: isListening ? "scale(1.4)" : "scale(0.8)",
                }}
            />
        </div>
    );
}
