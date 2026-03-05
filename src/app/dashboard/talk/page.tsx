/**
 * /talk route — Voice-only interface for talking to the UnlockPi AI agent.
 */
"use client";

import {
    LiveKitRoom,
    RoomAudioRenderer,
    StartAudio,
    useVoiceAssistant,
    useLocalParticipant,
    VoiceAssistantControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { useConnection } from "./_hooks/use-connection";
import { useBoardRPC } from "./_hooks/use-board-rpc";
import { useTranscript } from "./_hooks/use-transcript";
import { TalkVisualizer } from "./_components/talk-visualizer";
import { TalkTranscript } from "./_components/talk-transcript";
import { ConnectionScreen } from "./_components/connection-screen";
import { TalkBackground } from "./_components/talk-background";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// TalkPage — top-level component
// ---------------------------------------------------------------------------
export default function TalkPage() {
    const { token, isConnecting, error, connect, disconnect } = useConnection();

    return (
        <div className="min-h-screen bg-[var(--color-black)]">
            <LiveKitRoom
                video={false}
                audio={true}
                token={token || undefined}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                data-lk-theme="default"
                style={{ height: "100vh" }}
                onDisconnected={disconnect}
            >
                <ActiveRoom
                    connect={connect}
                    isConnecting={isConnecting}
                    isConnected={!!token}
                    error={error}
                />
                <RoomAudioRenderer />
                <StartAudio label="Click to allow audio" />
            </LiveKitRoom>
        </div>
    );
}

// ---------------------------------------------------------------------------
// ActiveRoom — all interactive UI, lives inside <LiveKitRoom>.
// ---------------------------------------------------------------------------
interface ActiveRoomProps {
    connect: () => void;
    isConnecting: boolean;
    isConnected: boolean;
    error: string | null;
}

function ActiveRoom({ connect, isConnecting, isConnected, error }: ActiveRoomProps) {
    const { state, audioTrack } = useVoiceAssistant();
    const { localParticipant, microphoneTrack } = useLocalParticipant();

    // Board RPC State
    const { boardText, boardHighlights } = useBoardRPC();

    // Transcript State
    const { transcriptLog, liveAgentText, liveUserText } = useTranscript();

    // Build a TrackReferenceOrPlaceholder for the local mic
    const micTrackRef = microphoneTrack
        ? { participant: localParticipant, publication: microphoneTrack, source: Track.Source.Microphone }
        : undefined;

    // Whether we're truly "live" in a room
    const isLive = isConnected && state !== "disconnected" && state !== "connecting";

    return (
        <div className={cn(
            "flex flex-col items-center h-full gap-6 px-6 py-6 relative overflow-hidden transition-all duration-500",
            // Center content vertically if not connected, otherwise start from top
            !isConnected ? "justify-center" : "justify-start"
        )}>
            <TalkBackground state={state} />

            <TalkVisualizer
                state={state}
                isLive={isLive}
                audioTrack={audioTrack}
                micTrackRef={micTrackRef}
                liveAgentText={liveAgentText}
                boardText={boardText}
                boardHighlights={boardHighlights}
            />

            {/* ── Connect button (shown when not connected) ── */}
            {/* Wrapped in a div to ensure proper spacing/positioning relative to centered visualizer */}
            {!isConnected && (
                <div className="mt-8">
                    <ConnectionScreen
                        connect={connect}
                        isConnecting={isConnecting}
                        error={error}
                    />
                </div>
            )}

            {/* ── Transcript (Bottom Fixed) ── */}
            {isLive && (
                <TalkTranscript
                    transcriptLog={transcriptLog}
                    liveAgentText={liveAgentText}
                    liveUserText={liveUserText}
                />
            )}

            {/* ── Controls (only when connected) ── */}
            {isConnected && (
                <div className="flex flex-col items-center gap-2 relative z-10 flex-shrink-0 mt-4">
                    <VoiceAssistantControlBar controls={{ leave: false }} />
                    <button
                        onClick={() => window.location.reload()}
                        className="text-xs text-[var(--color-gray)] hover:text-white underline decoration-dotted transition-colors"
                    >
                        Disconnect & Exit
                    </button>
                </div>
            )}
        </div>
    );
}
