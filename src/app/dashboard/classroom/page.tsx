/**
 * Classroom page — the main interactive view for the Pi Tutor.
 * Styled with the Pi AI dark + orange design language.
 *
 * This page:
 * 1. Fetches a LiveKit access token from /api/token
 * 2. Connects to the LiveKit room (same room the Python agent joins)
 * 3. Registers RPC handlers so the agent can control the UI:
 *    - highlight_text: highlight words (nouns, pronouns, etc.)
 *    - update_content: change the text shown on the content panel
 *    - show_student_focus: highlight a student on the seating matrix
 *    - start_cognitive_test: switch to Family Feud mode
 * 4. Renders audio (agent voice) and the classroom UI
 */

"use client";

import {
    LiveKitRoom,
    RoomAudioRenderer,
    StartAudio,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useEffect, useState } from "react";
import { ContentPanel } from "@/components/content-panel";
import { SeatingMatrix } from "@/components/seating-matrix";
import { TranscriptPanel } from "@/components/transcript-panel";
import { CognitiveBoard, CognitiveAnswer } from "@/components/cognitive-board"; // Import new component
import { useRpcHandler } from "@/hooks/use-rpc-handler";
import useSound from "use-sound";

export default function ClassroomPage() {
    const [token, setToken] = useState("");

    // State controlled by the agent via RPC
    const [content, setContent] = useState(
        "The quick brown fox jumps over the lazy dog. Programming is fun, and Artificial Intelligence helps us learn faster."
    );
    const [highlights, setHighlights] = useState<any[]>([]);
    const [focusedStudent, setFocusedStudent] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<string[]>([]);

    // --- Cognitive Test State ---
    const [viewMode, setViewMode] = useState<"content" | "cognitive_test">("content");
    const [cognitiveQuestion, setCognitiveQuestion] = useState("");
    const [cognitiveAnswers, setCognitiveAnswers] = useState<CognitiveAnswer[]>([]);
    const [teamScores, setTeamScores] = useState<Record<string, number>>({
        "Team Alpha": 0,
        "Team Beta": 0,
        "Team Gamma": 0,
    });

    useEffect(() => {
        (async () => {
            try {
                const resp = await fetch(
                    `/api/token?room=classroom-101&username=teacher-interface`
                );
                const data = await resp.json();
                if (data.error) {
                    console.error("Token error:", data.error);
                    return;
                }
                setToken(data.accessToken);
            } catch (e) {
                console.error("Failed to fetch token:", e);
            }
        })();
    }, []);

    // Loading state — spinner with orange accent
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
            <ClassroomInner
                content={content}
                setContent={setContent}
                highlights={highlights}
                setHighlights={setHighlights}
                focusedStudent={focusedStudent}
                setFocusedStudent={setFocusedStudent}
                transcript={transcript}
                setTranscript={setTranscript}

                // Cognitive Test Props
                viewMode={viewMode}
                setViewMode={setViewMode}
                cognitiveQuestion={cognitiveQuestion}
                setCognitiveQuestion={setCognitiveQuestion}
                cognitiveAnswers={cognitiveAnswers}
                setCognitiveAnswers={setCognitiveAnswers}
                teamScores={teamScores}
                setTeamScores={setTeamScores}
            />
            <RoomAudioRenderer />
            <StartAudio label="Click to start class" />
        </LiveKitRoom>
    );
}

/**
 * Inner component that lives inside <LiveKitRoom> so useRoomContext is available.
 * Registers all RPC handlers the agent can call to control the UI.
 */
function ClassroomInner({
    content,
    setContent,
    highlights,
    setHighlights,
    focusedStudent,
    setFocusedStudent,
    transcript,
    setTranscript,

    viewMode,
    setViewMode,
    cognitiveQuestion,
    setCognitiveQuestion,
    cognitiveAnswers,
    setCognitiveAnswers,
    teamScores,
    setTeamScores,
}: any) {
    // --- RPC HANDLERS (called by the Python agent via perform_rpc) ---

    // 1. Highlight Text — agent sends tagged words to highlight on the content panel
    useRpcHandler("highlight_text", async (payload: any) => {
        console.log("[RPC] highlight_text:", payload);
        if (payload.words) {
            setHighlights(payload.words);
            setViewMode("content"); // Switch back to content if highlighting
        }
    });

    // 2. Update Content — agent sends new text to display on the board
    useRpcHandler("update_content", async (payload: any) => {
        console.log("[RPC] update_content:", payload);
        if (payload.text) {
            setContent(payload.text);
            setHighlights([]); // Clear old highlights when content changes
            setViewMode("content"); // Ensure we show the board
        }
    });

    // 3. Focus Student — agent highlights a student on the seating matrix
    useRpcHandler("show_student_focus", async (payload: any) => {
        console.log("[RPC] show_student_focus:", payload);
        if (payload.studentName) {
            setFocusedStudent(payload.studentName);
            // Auto-clear focus after 5 seconds
            setTimeout(() => setFocusedStudent(null), 5000);
        }
    });

    // --- SOUND EFFECTS ---
    const [playReveal] = useSound("/reveal.mp3", { volume: 0.5 });
    const [playBuzzer] = useSound("/buzzer.mp3", { volume: 0.5 });

    // --- COGNITIVE TEST HANDLERS ---

    // 4. Start Cognitive Test
    useRpcHandler("start_cognitive_test", async (payload: any) => {
        console.log("[RPC] start_cognitive_test:", payload);
        if (payload.question && payload.answers) {
            setCognitiveQuestion(payload.question);
            // Initialize answers as unrevealed
            const answers = payload.answers.map((a: any) => ({
                text: a.text,
                percentage: a.percentage,
                revealed: false // Hidden by default
            }));
            setCognitiveAnswers(answers);
            setViewMode("cognitive_test");
        }
    });

    // 5. Reveal Answer
    useRpcHandler("reveal_answer", async (payload: any) => {
        console.log("[RPC] reveal_answer:", payload);
        const index = payload.index;
        if (typeof index === "number") {
            setCognitiveAnswers((prev: any) => {
                const newAnswers = [...prev];
                if (newAnswers[index]) {
                    newAnswers[index].revealed = true;
                }
                return newAnswers;
            });
            playReveal();
        }
    });

    // 6. Update Scores
    useRpcHandler("update_scores", async (payload: any) => {
        console.log("[RPC] update_scores:", payload);
        if (payload.scores) {
            setTeamScores(payload.scores);
        }
    });

    // 7. Show Error Buzzer
    useRpcHandler("show_error_buzzer", async (payload: any) => {
        console.log("[RPC] show_error_buzzer");
        playBuzzer();
    });


    return (
        <div className="flex h-screen bg-[var(--color-black)] text-[var(--color-white)] p-4 gap-4 font-[var(--font-body)]">
            {/* LEFT COLUMN - INTERACTIVE BOARD */}
            <div className="flex-1 flex flex-col gap-4">
                <header className="flex justify-between items-center p-4 bg-[var(--color-darkest-gray)] rounded-xl border border-[var(--color-darker-gray)]">
                    <div>
                        <img
                            src="/unlockpi-logo.png"
                            alt="UnlockPi Logo"
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

                {/* Switch between Content Panel and Cognitive Board based on mode */}
                {viewMode === "cognitive_test" ? (
                    <CognitiveBoard
                        question={cognitiveQuestion}
                        answers={cognitiveAnswers}
                        teamScores={teamScores}
                    />
                ) : (
                    <ContentPanel
                        content={content}
                        highlights={highlights}
                        rules={[
                            { type: "noun", color: "#ff4d00", style: "highlight" },
                            { type: "pronoun", color: "#afafaf", style: "underline" },
                            { type: "adjective", color: "#ff8855", style: "highlight" },
                            { type: "verb", color: "#ffc3aa", style: "underline" },
                        ]}
                    />
                )}

                <TranscriptPanel transcript={transcript} />
            </div>

            {/* RIGHT COLUMN - CLASSROOM MANAGEMENT */}
            <div className="w-80 flex flex-col gap-4">
                <SeatingMatrix focusedStudentId={focusedStudent} />

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
