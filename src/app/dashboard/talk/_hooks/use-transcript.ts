"use client";

import { useEffect, useRef, useState } from "react";
import { useVoiceAssistant, useLocalParticipant, useTrackTranscription } from "@livekit/components-react";
import { Track } from "livekit-client";

// Transcript entry with sender tagging
export interface TranscriptEntry {
    text: string;
    sender: "user" | "agent";
    id: string; // unique key for animation
}

export function useTranscript() {
    const { agentTranscriptions } = useVoiceAssistant();
    const { localParticipant, microphoneTrack } = useLocalParticipant();

    // Build a TrackReferenceOrPlaceholder for the local mic
    const micTrackRef = microphoneTrack
        ? { participant: localParticipant, publication: microphoneTrack, source: Track.Source.Microphone }
        : undefined;

    // Get user speech transcription from local mic track
    const { segments: userSegments } = useTrackTranscription(micTrackRef as any);

    const [transcriptLog, setTranscriptLog] = useState<TranscriptEntry[]>([]);
    const entryCounter = useRef(0); // for unique IDs

    // Track last-seen finalized segment lengths to detect new entries
    const lastAgentLen = useRef(0);
    const lastUserLen = useRef(0);

    useEffect(() => {
        const newEntries: TranscriptEntry[] = [];

        // New agent transcription segments (finalized)
        if (agentTranscriptions.length > lastAgentLen.current) {
            for (let i = lastAgentLen.current; i < agentTranscriptions.length; i++) {
                const seg = agentTranscriptions[i];
                if (seg.text && seg.final) {
                    newEntries.push({
                        text: seg.text,
                        sender: "agent",
                        id: `agent-${entryCounter.current++}`,
                    });
                }
            }
            lastAgentLen.current = agentTranscriptions.length;
        }

        // New user transcription segments (finalized)
        if (userSegments.length > lastUserLen.current) {
            for (let i = lastUserLen.current; i < userSegments.length; i++) {
                const seg = userSegments[i];
                if (seg.text && seg.final) {
                    newEntries.push({
                        text: seg.text,
                        sender: "user",
                        id: `user-${entryCounter.current++}`,
                    });
                }
            }
            lastUserLen.current = userSegments.length;
        }

        if (newEntries.length > 0) {
            setTranscriptLog((prev) => [...prev, ...newEntries]);
        }
    }, [agentTranscriptions, userSegments]);

    // Current "live" segment (not yet finalized)
    const liveAgentText =
        agentTranscriptions.length > 0 &&
            !agentTranscriptions[agentTranscriptions.length - 1].final
            ? agentTranscriptions[agentTranscriptions.length - 1].text
            : null;

    const liveUserText =
        userSegments.length > 0 &&
            !userSegments[userSegments.length - 1].final
            ? userSegments[userSegments.length - 1].text
            : null;

    return { transcriptLog, liveAgentText, liveUserText };
}
