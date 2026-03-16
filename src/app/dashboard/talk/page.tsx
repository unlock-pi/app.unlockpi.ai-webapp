/**
 * /talk route — Voice-only interface for talking to the UnlockPi AI agent.
 *
 * Layout (when connected):
 *   The LiveKitRoom fills the full viewport height.
 *   TalkVisualizer gets flex-1, giving it all remaining space after TalkBackground.
 *   Inside TalkVisualizer: compact header bar + full-height board + transcript overlay.
 */
"use client";

import {
    LiveKitRoom,
    RoomAudioRenderer,
    StartAudio,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useConnection } from "./_hooks/use-connection";
import { TalkRoomContent } from "./_components/talk-room-content";

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
                <TalkRoomContent
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
