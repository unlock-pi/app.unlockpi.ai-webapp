import { AgentState, TrackReferenceOrPlaceholder, VoiceAssistantControlBar } from "@livekit/components-react";
import { TalkBrand } from "./talk-brand";
import { TalkMatrix } from "./talk-matrix";

interface TalkHeaderBarProps {
  stateLabel: string;
  state: AgentState;
  isLive: boolean;
  isAgentSpeaking: boolean;
  isThinking: boolean;
  isListening: boolean;
  activeLevels: number[];
  audioTrack?: TrackReferenceOrPlaceholder;
  onDisconnect: () => void;
}

export function TalkHeaderBar({
  stateLabel,
  state,
  isLive,
  isAgentSpeaking,
  isThinking,
  isListening,
  activeLevels,
  audioTrack,
  onDisconnect,
}: TalkHeaderBarProps) {
  return (
    <div className="flex items-center justify-center w-full px-4 py-2 gap-10 flex-shrink-0 border-b border-[var(--color-darker-gray)]/60">
      <TalkBrand isLive={isLive} isAgentSpeaking={isAgentSpeaking} stateLabel={stateLabel} />

      <TalkMatrix
        isLive={isLive}
        isAgentSpeaking={isAgentSpeaking}
        isThinking={isThinking}
        isListening={isListening}
        activeLevels={activeLevels}
        state={state}
        audioTrack={audioTrack}
      />

      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
        <VoiceAssistantControlBar controls={{ leave: false }} />
        <button
          onClick={onDisconnect}
          className="text-xs text-[var(--color-gray)] hover:text-white underline decoration-dotted transition-colors"
        >
          Disconnect &amp; Exit
        </button>
      </div>
    </div>
  );
}
