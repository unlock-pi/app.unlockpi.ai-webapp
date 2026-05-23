"use client";

import { useMemo } from "react";
import {
  useLocalParticipant,
  useTrackTranscription,
  useVoiceAssistant,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";

export interface TranscriptEntry {
  text: string;
  sender: "user" | "agent";
  id: string;
}

export function useTranscript() {
  const { agentTranscriptions } = useVoiceAssistant();
  const { localParticipant, microphoneTrack } = useLocalParticipant();

  const micTrackRef = useMemo<TrackReferenceOrPlaceholder | undefined>(() => {
    if (!microphoneTrack) {
      return undefined;
    }

    return {
      participant: localParticipant,
      publication: microphoneTrack,
      source: Track.Source.Microphone,
    };
  }, [localParticipant, microphoneTrack]);

  const { segments: userSegments } = useTrackTranscription(micTrackRef);

  const transcriptLog = useMemo<TranscriptEntry[]>(() => {
    const agentEntries = agentTranscriptions
      .filter((segment) => segment.text && segment.final)
      .map((segment, index) => ({
        text: segment.text,
        sender: "agent" as const,
        id: `agent-${index}`,
      }));

    const userEntries = userSegments
      .filter((segment) => segment.text && segment.final)
      .map((segment, index) => ({
        text: segment.text,
        sender: "user" as const,
        id: `user-${index}`,
      }));

    return [...agentEntries, ...userEntries].sort((left, right) => left.id.localeCompare(right.id));
  }, [agentTranscriptions, userSegments]);

  const liveAgentText =
    agentTranscriptions.length > 0 && !agentTranscriptions[agentTranscriptions.length - 1].final
      ? agentTranscriptions[agentTranscriptions.length - 1].text
      : null;

  const liveUserText =
    userSegments.length > 0 && !userSegments[userSegments.length - 1].final
      ? userSegments[userSegments.length - 1].text
      : null;

  return { transcriptLog, liveAgentText, liveUserText };
}
