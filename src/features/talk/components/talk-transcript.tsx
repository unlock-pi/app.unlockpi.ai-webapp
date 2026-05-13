"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { TranscriptEntry } from "../hooks/use-transcript";

// Max visible transcript lines in the scrollable container
const MAX_TRANSCRIPT_LINES = 6;

interface TalkTranscriptProps {
    transcriptLog: TranscriptEntry[];
    liveAgentText: string | null;
    liveUserText: string | null;
}

export function TalkTranscript({ transcriptLog, liveAgentText, liveUserText }: TalkTranscriptProps) {
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll transcript to bottom
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcriptLog, liveAgentText, liveUserText]);

    return (
        <div className="w-full max-w-5xl mt-auto z-10 flex flex-col gap-2 flex-shrink-0">
            <div className="w-full rounded-xl  bg-[var(--color-darkest-gray)]/60 border border-[var(--color-darker-gray)] backdrop-blur-md shadow-2xl">
                <div
                    className={cn(
                        "flex flex-col gap-2 p-2 text-sm",
                        "max-h-48 overflow-y-auto",
                        "[&::-webkit-scrollbar]:w-1",
                        "[&::-webkit-scrollbar-track]:bg-transparent",
                        "[&::-webkit-scrollbar-thumb]:bg-white/10",
                        "[&::-webkit-scrollbar-thumb]:rounded-full"
                    )}
                >
                    {transcriptLog.length === 0 && !liveAgentText && !liveUserText ? (
                        <p className="text-foreground/80 text-sm italic text-center py-2">
                            Conversation started. Say hello!
                        </p>
                    ) : (
                        <>
                            {/* Finalized transcript entries */}
                            {/* {transcriptLog.slice(-MAX_TRANSCRIPT_LINES).map((entry) => (
                                <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={cn(
                                        "max-w-[85%] px-3 py-2 rounded-lg leading-relaxed shadow-sm", "self-start text-left text-gray-200 bg-white/5 border border-white/5"
                                        // entry.sender === "agent"
                                        //     ? "self-start text-left text-gray-200 bg-white/5 border border-white/5"
                                        //     : "self-end text-right text-blue-100 bg-blue-500/20 border border-blue-500/20"
                                    // FIX the above things, this is the one that's braking the ui
                                        )}
                                >

                                    {entry.text}
                                </motion.div>
                            ))} */}

                            {/* Live streaming text — single combined indicator, no separate floating bubbles */}
                            {(liveAgentText || liveUserText) && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.7 }}
                                    className="px-3 py-1.5 rounded-lg text-gray-400 bg-white/5 italic text-left"
                                >
                                    {liveAgentText && (
                                        <span className="block text-gray-400">{liveAgentText}</span>
                                    )}
                                    {liveUserText && (
                                        <span className="block text-blue-300/70 text-right">{liveUserText}</span>
                                    )}
                                </motion.div>
                            )}

                            <div ref={transcriptEndRef} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
