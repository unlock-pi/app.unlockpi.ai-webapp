"use client";

import { Track } from "livekit-client";
import { useLocalParticipant, useVoiceAssistant } from "@livekit/components-react";
import { cn } from "@/lib/utils";
import { useBoardRPC } from "../hooks/use-board-rpc";
import { useTranscript } from "../hooks/use-transcript";
import { TalkVisualizer } from "./talk-visualizer";
import { TalkTranscript } from "./talk-transcript";
import { ConnectionScreen } from "./connection-screen";
import { TalkBackground } from "./talk-background";
import { useThinkingAmbience } from "@/features/talk/hooks/use-thinking-ambience";

interface TalkRoomContentProps {
  connect: () => void;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
}

export function TalkRoomContent({ connect, isConnecting, isConnected, error }: TalkRoomContentProps) {
  const { state, audioTrack } = useVoiceAssistant();
  const { localParticipant, microphoneTrack } = useLocalParticipant();

  const { boardText, boardHighlights, boardDocument } = useBoardRPC();
  const { transcriptLog, liveAgentText, liveUserText } = useTranscript();

  const micTrackRef = microphoneTrack
    ? { participant: localParticipant, publication: microphoneTrack, source: Track.Source.Microphone }
    : undefined;

  const isLive = isConnected && state !== "disconnected" && state !== "connecting";
  useThinkingAmbience(isLive && state === "thinking");

  return (
    <div
      className={cn(
        "flex flex-col h-full relative overflow-hidden transition-all duration-500",
        !isConnected ? "items-center justify-center px-6 py-6 gap-6" : "items-stretch gap-0"
      )}
    >
      <TalkBackground state={state} />

      <TalkVisualizer
        state={state}
        isLive={isLive}
        isConnected={isConnected}
        audioTrack={audioTrack}
        micTrackRef={micTrackRef}
        boardText={boardText}
        boardHighlights={boardHighlights}
        boardDocument={boardDocument}
        onDisconnect={() => window.location.reload()}
        transcriptSlot={
          isLive ? (
            <TalkTranscript
              transcriptLog={transcriptLog}
              liveAgentText={liveAgentText}
              liveUserText={liveUserText}
            />
          ) : undefined
        }
      />

      {!isConnected && (
        <div className="mt-8">
          <ConnectionScreen connect={connect} isConnecting={isConnecting} error={error} />
        </div>
      )}
    </div>
  );
}
