/**
 * Custom hook to extract real-time frequency data from a LiveKit audio track.
 * Accepts either a TrackReference (from useVoiceAssistant) or a TrackPublication
 * (from useLocalParticipant). Returns an array of normalized levels (0-1) suitable
 * for driving the Matrix component in "vu" mode.
 */
"use client";

import { useEffect, useRef, useState, useMemo } from "react";

/**
 * Accepts a generic object that has a way to get to a MediaStreamTrack.
 * Supports:
 *   - TrackReference  → trackRef.publication.track.mediaStreamTrack
 *   - TrackPublication → pub.track.mediaStreamTrack
 *   - undefined
 */
export function useAudioAnalyzer(
    trackSource: any | undefined,
    fftSize: number = 64
): number[] {
    const binCount = fftSize / 2;
    const [data, setData] = useState<number[]>(() => new Array(binCount).fill(0));
    const rafRef = useRef<number | undefined>(undefined);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Resolve a MediaStreamTrack from whichever shape we received
    const mediaStreamTrack = useMemo(() => {
        if (!trackSource) return undefined;

        // TrackReference shape: { publication: { track: { mediaStreamTrack } } }
        if (trackSource?.publication?.track?.mediaStreamTrack) {
            return trackSource.publication.track.mediaStreamTrack as MediaStreamTrack;
        }

        // TrackPublication shape: { track: { mediaStreamTrack } }
        if (trackSource?.track?.mediaStreamTrack) {
            return trackSource.track.mediaStreamTrack as MediaStreamTrack;
        }

        // Raw MediaStreamTrack
        if (trackSource instanceof MediaStreamTrack) {
            return trackSource;
        }

        return undefined;
    }, [trackSource]);

    useEffect(() => {
        if (!mediaStreamTrack) {
            // Reset to zeros when no track
            setData(new Array(binCount).fill(0));
            return;
        }

        const AudioContextClass =
            window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        // Create AudioContext
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        // Resume if suspended (browser autoplay policy)
        if (ctx.state === "suspended") {
            ctx.resume().catch(() => { });
        }

        try {
            const source = ctx.createMediaStreamSource(
                new MediaStream([mediaStreamTrack])
            );
            sourceRef.current = source;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = fftSize;
            analyser.smoothingTimeConstant = 0.75;
            source.connect(analyser); // Don't connect to destination (avoids echo)
            analyserRef.current = analyser;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const update = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                // Normalize each bin to 0–1
                const normalized = Array.from(dataArray).map((val) => val / 255);
                setData(normalized);
                rafRef.current = requestAnimationFrame(update);
            };

            update();

            return () => {
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                source.disconnect();
                analyserRef.current = null;
                sourceRef.current = null;
                if (ctx.state !== "closed") ctx.close().catch(() => { });
                audioContextRef.current = null;
            };
        } catch (err) {
            console.error("[useAudioAnalyzer] Setup failed:", err);
        }
    }, [mediaStreamTrack, fftSize, binCount]);

    return data;
}
