/**
 * Transcript panel — shows a scrollable list of live transcript lines.
 * Styled with Pi AI's dark theme and JetBrains Mono for the prompt markers.
 */

import { cn } from "@/lib/utils";

interface TranscriptPanelProps {
    transcript: string[];
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
    return (
        <div className="bg-[var(--color-darkest-gray)] rounded-xl border border-[var(--color-darker-gray)] flex flex-col h-[300px]">
            <div className="p-3 border-b border-[var(--color-darker-gray)] bg-[var(--color-darkest-gray)]">
                <h3 className="text-[var(--color-gray)] text-xs font-medium uppercase tracking-wider">
                    Live Transcript
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-[var(--font-jb-mono)] text-sm">
                {transcript.length === 0 && (
                    <div className="text-[var(--color-dark-gray)] text-center italic mt-10">
                        Listening...
                    </div>
                )}
                {transcript.map((line, i) => (
                    <div key={i} className="text-[var(--color-lighter-gray)]">
                        <span className="text-[var(--color-orange)] mr-2 opacity-60">
                            {">"}{" "}
                        </span>
                        {line}
                    </div>
                ))}
            </div>
        </div>
    );
}
