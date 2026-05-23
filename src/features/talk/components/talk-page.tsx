"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LiveKitRoom, RoomAudioRenderer, StartAudio } from "@livekit/components-react";
import "@livekit/components-styles";

import { useLiveKitRoomConnection } from "@/features/classroom/hooks/use-livekit-room-connection";
import { TalkRoomContent } from "@/features/talk/components/talk-room-content";

export function TalkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-black)]" />}>
      <TalkPageContent />
    </Suspense>
  );
}

function TalkPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") ?? searchParams.get("sessionId");
  const { token, isConnecting, error, connect, disconnect } = useLiveKitRoomConnection({
    room: "classroom-101",
    username: "teacher-interface",
    sessionId,
  });

  return (
    <div className="min-h-screen bg-[var(--color-black)]">
      <LiveKitRoom
        video={false}
        audio
        token={token || undefined}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        data-lk-theme="default"
        style={{ height: "100vh" }}
        onDisconnected={disconnect}
      >
        <TalkRoomContent
          connect={connect}
          isConnecting={isConnecting}
          isConnected={Boolean(token)}
          error={error}
        />
        <RoomAudioRenderer />
        <StartAudio label="Click to allow audio" />
      </LiveKitRoom>
    </div>
  );
}
