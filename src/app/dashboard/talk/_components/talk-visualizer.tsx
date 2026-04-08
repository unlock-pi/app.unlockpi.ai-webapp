"use client";

import { AgentState, TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { useAudioAnalyzer } from "@/hooks/use-audio-analyzer";
import { HighlightWord } from "@/components/board-panel";
import type { BoardDocument } from "@/types/board";
import { TalkHeaderBar } from "./talk-header-bar";
import { TalkBoardStage } from "./talk-board-stage";
import { TalkBrand } from "./talk-brand";
import { TalkMatrix } from "./talk-matrix";

interface TalkVisualizerProps {
  state: AgentState;
  isLive: boolean;
  isConnected: boolean;
  audioTrack?: TrackReferenceOrPlaceholder;
  micTrackRef?: TrackReferenceOrPlaceholder;
  boardText: string;
  boardHighlights: HighlightWord[];
  boardDocument: BoardDocument;
  onDisconnect: () => void;
  transcriptSlot?: React.ReactNode;
}

const STATE_LABELS: Record<string, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting...",
  initializing: "Initializing...",
  idle: "Listening",
  listening: "Listening...",
  thinking: "Thinking...",
  speaking: "Speaking...",
};

export function TalkVisualizer({
  state,
  isLive,
  isConnected,
  audioTrack,
  micTrackRef,
  boardText,
  boardHighlights,
  boardDocument,
  onDisconnect,
  transcriptSlot,
}: TalkVisualizerProps) {
  const agentLevels = useAudioAnalyzer(audioTrack, 64);
  const micLevels = useAudioAnalyzer(micTrackRef, 64);

  const isAgentSpeaking = state === "speaking";
  const isListening = state === "listening" || state === "idle";
  const isThinking = state === "thinking";

  const activeLevels = isAgentSpeaking
    ? agentLevels.slice(0, 28)
    : isListening
      ? micLevels.slice(0, 28).reverse()
      : new Array(28).fill(0);

  const stateLabel = STATE_LABELS[state] || state;

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-7xl gap-8 relative z-10 min-h-0">
        <section className="flex flex-row-reverse items-center gap-10">
          <TalkMatrix
            isLive={isLive}
            isAgentSpeaking={isAgentSpeaking}
            isThinking={isThinking}
            isListening={isListening}
            activeLevels={activeLevels}
            state={state}
            audioTrack={audioTrack}
          />
          <TalkBrand isLive={isLive} isAgentSpeaking={isAgentSpeaking} stateLabel={stateLabel} />
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 relative z-10">
      <TalkHeaderBar
        stateLabel={stateLabel}
        state={state}
        isLive={isLive}
        isAgentSpeaking={isAgentSpeaking}
        isThinking={isThinking}
        isListening={isListening}
        activeLevels={activeLevels}
        audioTrack={audioTrack}
        onDisconnect={onDisconnect}
      />
      <TalkBoardStage
        boardText={boardText}
        boardHighlights={boardHighlights}
        boardDocument={boardDocument}
        isThinking={isThinking}
        transcriptSlot={transcriptSlot}
      />
    </div>
  );
}
