/**
 * Classroom page - the main interactive view for the Pi Tutor.
 *
 * This page consumes the shared realtime classroom module instead of owning
 * RPC registration and LiveKit state inline.
 */

"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    StartAudio,
} from "@livekit/components-react";
import "@livekit/components-styles";

import { ContentPanel } from "@/features/classroom/components/content-panel";
import { SeatingMatrix } from "@/features/classroom/components/seating-matrix"; 
import { TranscriptPanel } from "@/features/classroom/components/transcript-panel";
import { CognitiveBoard } from "@/features/classroom/components/cognitive-board";
import { useLiveKitRoomConnection } from "../hooks/use-livekit-room-connection";
import { useClassroomRealtime } from "../hooks/use-classroom-realtime";


export default function ClassroomPage() {
    const { token, connect } = useLiveKitRoomConnection({
        room: "classroom-101",
        username: "teacher-interface",
    });

    useEffect(() => {
        if (!token) {
            void connect();
        }
    }, [connect, token]);

    if (token === "") {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--color-black)] text-[var(--color-white)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-[var(--color-orange)]/30 border-t-[var(--color-orange)] rounded-full animate-spin" />
                    <span className="text-[var(--color-gray)] text-sm">
                        Connecting to classroom...
                    </span>
                </div>
            </div>
        );
    }

    return (
        <LiveKitRoom
            video={false}
            audio={true}
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            data-lk-theme="default"
            style={{ height: "100vh" }}
        >
            <ClassroomInner />
            <RoomAudioRenderer />
            <StartAudio label="Click to start class" />
        </LiveKitRoom>
    );
}

function ClassroomInner() {
    const realtimeState = useClassroomRealtime();

    return (
        <div className="flex h-screen bg-[var(--color-black)] text-[var(--color-white)] p-4 gap-4 font-[var(--font-body)]">
            <div className="flex-1 flex flex-col gap-4">
                <header className="flex justify-between items-center p-4 bg-[var(--color-darkest-gray)] rounded-xl border border-[var(--color-darker-gray)]">
                    <div>
                        <Image
                            src="/unlockpi-logo.png"
                            alt="UnlockPi Logo"
                            width={160}
                            height={40}
                            className="h-10 w-auto object-contain"
                        />
                        <p className="text-[var(--color-gray)] text-xs mt-1">
                            Classroom 101 • Science
                        </p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <div className="w-3 h-3 rounded-full bg-[var(--color-orange)] animate-pulse" />
                        <span className="text-xs text-[var(--color-orange)] font-medium font-[var(--font-jb-mono)]">
                            LIVE
                        </span>
                    </div>
                </header>

                {realtimeState.viewMode === "cognitive_test" ? (
                    <CognitiveBoard
                        question={realtimeState.cognitiveQuestion}
                        answers={realtimeState.cognitiveAnswers}
                        teamScores={realtimeState.teamScores}
                    />
                ) : (
                    <ContentPanel
                        content={realtimeState.boardText}
                        highlights={realtimeState.boardHighlights}
                        rules={[
                            { type: "noun", color: "#ff4d00", style: "highlight" },
                            { type: "pronoun", color: "#afafaf", style: "underline" },
                            { type: "adjective", color: "#ff8855", style: "highlight" },
                            { type: "verb", color: "#ffc3aa", style: "underline" },
                        ]}
                    />
                )}

                <TranscriptPanel transcript={realtimeState.transcript} />
            </div>

            <div className="w-80 flex flex-col gap-4">
                <SeatingMatrix focusedStudentId={realtimeState.focusedStudent} />

                <div className="bg-[var(--color-darkest-gray)] p-6 rounded-xl border border-[var(--color-darker-gray)] flex-1">
                    <h3 className="text-[var(--color-gray)] text-sm font-medium mb-4 uppercase tracking-wider">
                        Lesson Plan
                    </h3>
                    <ul className="space-y-4">
                        <li className="flex gap-3 text-sm text-[var(--color-lighter-gray)]">
                            <span className="text-[var(--color-orange)] font-[var(--font-jb-mono)]">
                                09:00
                            </span>
                            <span>Intro to Physics</span>
                        </li>
                        <li className="flex gap-3 text-sm text-[var(--color-lighter-gray)]">
                            <span className="text-[var(--color-orange)] font-[var(--font-jb-mono)]">
                                09:15
                            </span>
                            <span>Newton&apos;s Laws</span>
                        </li>
                        <li className="flex gap-3 text-sm text-[var(--color-lighter-gray)] opacity-50">
                            <span className="text-[var(--color-orange)] font-[var(--font-jb-mono)]">
                                09:45
                            </span>
                            <span>Interactive Quiz</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
