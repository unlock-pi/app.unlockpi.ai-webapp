import { Matrix, pulse } from "@/components/ui/matrix";
import { AgentAudioVisualizerWave } from "@/features/talk/components/agent-audio-visualizer-wave";
import type { AgentState, TrackReferenceOrPlaceholder } from "@livekit/components-react";

const USE_WAVE_VISUALIZER = true;

interface TalkMatrixProps {
  isLive: boolean;
  isAgentSpeaking: boolean;
  isThinking: boolean;
  isListening: boolean;
  activeLevels: number[];
  state?: AgentState;
  audioTrack?: TrackReferenceOrPlaceholder;
}

export function TalkMatrix({
  isLive,
  isAgentSpeaking,
  isThinking,
  isListening,
  activeLevels,
  state,
  audioTrack,
}: TalkMatrixProps) {
  return (
    <div className="relative group flex-shrink-0">
      <div
        className="absolute -inset-4 bg-gradient-to-r from-[var(--color-orange)]/10 to-transparent blur-xl rounded-full transition-opacity duration-700 pointer-events-none"
        style={{ opacity: isAgentSpeaking ? 0.6 : isThinking ? 0.4 : isListening ? 0.3 : 0.15 }}
      />
      <div className="relative rounded-2xl bg-[var(--color-darkest-gray)]/50 border border-[var(--color-darker-gray)] backdrop-blur-sm shadow-2xl shadow-black/50 transition-all duration-500">
        {USE_WAVE_VISUALIZER ? (
          <AgentAudioVisualizerWave
            size="md"
            color="#dc2626"
            blur={0.1}
            lineWidth={2}
            audioTrack={audioTrack}
            state={state}
            colorShift={0.3}
            className="opacity-90"
          />
        ) : (
          <Matrix
            rows={15}
            cols={28}
            size={6}
            gap={3}
            {...(isLive
              ? isThinking
                ? { frames: pulse, fps: 12, loop: true }
                : { mode: "vu" as const, levels: activeLevels }
              : { frames: heroFrames, fps: 30, loop: true })}
            palette={{
              on: "var(--color-orange)",
              off: "var(--color-dark-gray)",
            }}
            className="opacity-90"
            ariaLabel="Voice Visualizer"
          />
        )}
      </div>
    </div>
  );
}

const heroFrames = (() => {
  const frames: number[][][] = [];
  const rows = 15;
  const cols = 28;
  const frameCount = 60;

  for (let f = 0; f < frameCount; f++) {
    const frame: number[][] = [];
    const t = (f / frameCount) * Math.PI * 2;

    for (let r = 0; r < rows; r++) {
      const rowArr: number[] = [];
      const normalizedY = r / (rows - 1);

      for (let c = 0; c < cols; c++) {
        const normalizedX = c / (cols - 1);
        const w1 = Math.sin(normalizedX * Math.PI * 2 + t);
        const w2 = Math.cos(normalizedX * Math.PI * 4 - t * 1.5);
        const center = 0.5 + (w1 * 0.2 + w2 * 0.1) * Math.sin(normalizedX * Math.PI);
        const dist = Math.abs(normalizedY - center);

        let intensity = 1 - Math.pow(dist * 3.5, 1.5);
        if (Math.random() > 0.98) intensity += 0.3;

        intensity = Math.max(0, Math.min(1, intensity));
        rowArr.push(intensity);
      }

      frame.push(rowArr);
    }

    frames.push(frame);
  }

  return frames;
})();
