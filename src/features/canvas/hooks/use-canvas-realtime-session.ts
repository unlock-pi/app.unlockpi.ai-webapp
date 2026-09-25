"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getFrameBlockTypes,
  type CanvasPresentationFrame,
} from "@/features/canvas/lib/canvas-presentation";
import type { PanelGenerateRequest } from "@/features/canvas/lib/panel-generation";
import { playConnectionCue, playMicCue } from "@/lib/openai-realtime/connection-sound";
import {
  finishRealtimeUsageSession,
  trackRealtimeResponse,
} from "@/features/realtime/lib/realtime-usage-client";
import type { RealtimeUsageResponse } from "@/features/realtime/types/realtime-usage";

export type CanvasRealtimeMode = "director" | "companion";

export type CanvasRealtimeAction = {
  action:
  | "next"
  | "previous"
  | "first"
  | "last"
  | "goto"
  | "find"
  | "add_array"
  | "set_array"
  | "resize_array"
  | "highlight_array_index"
  | "clear_array_highlight"
  | "append_array_value"
  | "pop_array_value"
  | "duplicate_array"
  | "push_stack"
  | "pop_stack";
  frame_number?: number;
  index?: number;
  length?: number;
  query?: string;
  title?: string;
  value?: string;
  values?: string[];
};

/** Actions that move between frames — the only ones allowed to narrate-and-advance. */
const NAVIGATION_ACTIONS = new Set<CanvasRealtimeAction["action"]>([
  "next",
  "previous",
  "first",
  "last",
  "goto",
  "find",
]);


/**
 * Represents the possible states a Canvas Realtime session can be in.
 *
 * - `idle`: The session is not currently doing anything.
 * - `connecting`: The session is in the process of establishing a connection.
 * - `connected`: The session has successfully established a connection.
 * - `paused`: The session has been paused.
 * - `error`: An error has occurred in the session.
 */
export type CanvasRealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "paused"
  | "error";

/** What the AI is doing right now, surfaced to the teacher as a sync HUD. */
export type RealtimeActivity = {
  kind: "listening" | "navigating" | "explaining" | "generating" | "walkthrough";
  label: string;
};

type RealtimeFunctionCall = {
  arguments?: string;
  call_id?: string;
  name?: string;
  type?: string;
};

type RealtimeServerEvent = RealtimeFunctionCall & {
  delta?: string;
  transcript?: string;
  item?: RealtimeFunctionCall;
  response?: RealtimeUsageResponse & { output?: RealtimeFunctionCall[] };
};

type UseCanvasRealtimeSessionArgs = {
  canvasTitle: string;
  canvasId?: string | null;
  frames: CanvasPresentationFrame[];
  mode: CanvasRealtimeMode;
  onAction: (action: CanvasRealtimeAction) => string;
  /** Fired when the model asks to render something in the side panel. */
  onPanelRequest?: (request: PanelGenerateRequest) => void;
};


export function useCanvasRealtimeSession({
  canvasTitle,
  canvasId,
  frames,
  mode,
  onAction,
  onPanelRequest,
}: UseCanvasRealtimeSessionArgs) {
  const [status, setStatus] = useState<CanvasRealtimeStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [activity, setActivity] = useState<RealtimeActivity | null>(null);
  // The AI's remote audio, surfaced so the presenter's visualizer can react to
  // the real voice. Only ever populated in companion mode — director mode is
  // silent by design, so there is no track to expose there.
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(
    null,
  );
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  /**
   * Whether THIS session actually reached "connected" at some point — guards
   * the "session ended" sound in `disconnect()`, which runs unconditionally
   * (including on unmount when nothing was ever connected, and defensively
   * before every `connect()`), so it must not fire on connects that never
   * happened.
   */
  const hadConnectionRef = useRef(false);
  /**
   * Bumped on every `connect()`; a run checks its own number against this
   * after each `await` to notice it's been superseded — by `disconnect()`
   * cancelling it, or by a newer `connect()`. That's what lets a teacher
   * click "cancel" mid-handshake: the in-flight attempt unwinds itself on
   * its next step instead of going on to open a connection nobody wants.
   */
  const connectGenerationRef = useRef(0);
  /** Aborts the connect attempt's own fetches — the fast half of cancelling; the slow half is the generation check. */
  const connectAbortRef = useRef<AbortController | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const handledCallIdsRef = useRef(new Set<string>());
  const onActionRef = useRef(onAction);
  const onPanelRequestRef = useRef(onPanelRequest);
  const modeRef = useRef(mode);
  const framesRef = useRef(frames);
  const usageSessionIdRef = useRef<string | null>(null);
  const captionBufferRef = useRef("");
  const captionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True between output_audio_buffer.started and .stopped — i.e. while the AI's
  // voice is actually playing out, which outlives response.done (generation
  // end). Gates caption/"speaking" teardown so the wave keeps reacting to the
  // real voice until the agent has truly finished talking.
  const audioPlaybackActiveRef = useRef(false);
  // Non-null while a guided walkthrough is running; holds the last frame in
  // range so we know when to stop pacing.
  const walkthroughRef = useRef<{ toFrame: number } | null>(null);

  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => {
    onPanelRequestRef.current = onPanelRequest;
  }, [onPanelRequest]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const disconnect = useCallback((options: { silent?: boolean } = {}) => {
    // Invalidates any `connect()` mid-flight: its own staleness checks start
    // returning true, and its fetch is cut instead of left to finish
    // pointlessly in the background.
    connectGenerationRef.current++;
    connectAbortRef.current?.abort();
    connectAbortRef.current = null;

    finishRealtimeUsageSession(usageSessionIdRef.current);
    usageSessionIdRef.current = null;
    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    peerConnectionRef.current
      ?.getSenders()
      .forEach((sender) => sender.track?.stop());
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }

    handledCallIdsRef.current.clear();
    walkthroughRef.current = null;
    audioPlaybackActiveRef.current = false;
    captionBufferRef.current = "";
    if (captionTimerRef.current) {
      clearTimeout(captionTimerRef.current);
      captionTimerRef.current = null;
    }
    setCaption("");
    setActivity(null);
    setRemoteAudioStream(null);
    setError(null);
    setStatus("idle");
    // `silent` is passed by the two call sites that immediately follow this
    // with `setStatus("error")` — the error cue alone says it, and playing
    // both back to back was two sounds landing on top of each other for one
    // event.
    if (hadConnectionRef.current) {
      hadConnectionRef.current = false;
      if (!options.silent) playConnectionCue("idle");
    }
  }, []);

  useEffect(() => disconnect, [disconnect]);

  const sendEvent = useCallback((event: Record<string, unknown>) => {
    if (dataChannelRef.current?.readyState !== "open") {
      return;
    }

    dataChannelRef.current.send(
      JSON.stringify({ event_id: crypto.randomUUID(), ...event }),
    );
  }, []);

  /**
   * Push the current-frame state into the model's context as a system item.
   * We deliberately do NOT follow it with response.create, so this updates
   * what the model *knows* without making it speak or act. Called whenever the
   * visible frame changes — this is what keeps the model's sight fresh.
   */
  const syncFrameContext = useCallback(
    (contextText: string) => {
      sendEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "system",
          content: [{ type: "input_text", text: contextText }],
        },
      });
    },
    [sendEvent],
  );

  const sendToolOutput = useCallback(
    (callId: string | undefined, output: string) => {
      if (!callId) {
        return;
      }

      sendEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output,
        },
      });
    },
    [sendEvent],
  );

  /**
   * This is the core sync fix. After the client navigates, it — not the model —
   * decides what gets narrated: ONLY the frame that is actually on screen now.
   * This is what stops the model narrating one frame ahead of the visuals.
   */
  const narrateCurrentFrame = useCallback(
    (frameLine: string, isWalkthrough: boolean) => {
      const base = `You are now showing ${frameLine}. In one or two short sentences, explain ONLY what is on THIS frame for the class. Never describe a frame you are not currently showing.`;
      const tail = isWalkthrough
        ? ' Then, to continue the walkthrough, call control_canvas with action "next". If this was the last frame, wrap up in one sentence instead of navigating.'
        : " Then stop and wait.";
      sendEvent({
        type: "response.create",
        response: { instructions: base + tail },
      });
    },
    [sendEvent],
  );

  /**
   * Brief, generic acknowledgment for content actions (array edits/highlights)
   * — never a frame-navigation instruction. Kept separate from
   * narrateCurrentFrame so array tweaks can't accidentally trigger "go to the
   * next frame."
   */
  const acknowledgeContentAction = useCallback(() => {
    sendEvent({
      type: "response.create",
      response: {
        instructions:
          "Briefly acknowledge the visual change in one short sentence, then continue helping the teacher.",
      },
    });
  }, [sendEvent]);

  /** Accumulate the AI's spoken/written words into the live caption. */
  const appendCaption = useCallback((delta: string) => {
    if (captionTimerRef.current) {
      clearTimeout(captionTimerRef.current);
      captionTimerRef.current = null;
    }
    captionBufferRef.current += delta;
    setCaption(captionBufferRef.current);
    setActivity((previous) =>
      previous?.kind === "walkthrough"
        ? previous
        : { kind: "explaining", label: "Explaining" },
    );
  }, []);

  /**
   * Let the last caption linger `delayMs`, then clear it and drop the
   * "explaining" activity (which returns the visualizer to idle). A walkthrough
   * keeps its activity so pacing isn't interrupted.
   */
  const fadeCaption = useCallback((delayMs: number) => {
    if (captionTimerRef.current) {
      clearTimeout(captionTimerRef.current);
    }
    captionTimerRef.current = setTimeout(() => {
      setCaption("");
      setActivity((previous) =>
        previous?.kind === "walkthrough" ? previous : null,
      );
    }, delayMs);
  }, []);

  const handleFunctionCall = useCallback(
    (call: RealtimeFunctionCall) => {
      if (!call.name || !call.arguments) {
        return;
      }

      const callKey = call.call_id ?? `${call.name}:${call.arguments}`;
      if (handledCallIdsRef.current.has(callKey)) {
        return;
      }
      handledCallIdsRef.current.add(callKey);

      if (call.name === "control_canvas") {
        try {
          const action = JSON.parse(call.arguments) as CanvasRealtimeAction;
          const currentState = onActionRef.current(action);
          sendToolOutput(
            call.call_id,
            JSON.stringify({ ok: true, current_state: currentState }),
          );

          // This is the fix for the "diagram keeps rerendering" bug: only
          // NAVIGATION actions may narrate-and-advance. Content actions
          // (highlight/set/resize/add array) used to fall through the same
          // path, which meant a walkthrough's "call next" instruction fired
          // after every array tweak too — so the AI kept flipping frames back
          // to back any time it touched an array mid-walkthrough.
          if (NAVIGATION_ACTIONS.has(action.action)) {
            const frameLine = currentState.split("\n")[0];
            const inWalkthrough = walkthroughRef.current !== null;
            const frameNumber = parseFrameNumber(currentState);

            // If a walkthrough is running and we've reached the last frame,
            // stop pacing so the model wraps up instead of looping forever.
            if (
              inWalkthrough &&
              frameNumber !== null &&
              frameNumber >= walkthroughRef.current!.toFrame
            ) {
              walkthroughRef.current = null;
            }

            setActivity(
              inWalkthrough
                ? { kind: "walkthrough", label: frameLine }
                : { kind: "navigating", label: frameLine },
            );

            // Narrate the shown frame in a walkthrough (either mode), or
            // after any nav in Co-teacher mode. Copilot stays silent
            // otherwise.
            if (inWalkthrough || modeRef.current === "companion") {
              narrateCurrentFrame(frameLine, inWalkthrough);
            }
          } else if (modeRef.current === "companion") {
            // Content action (array edit/highlight) — a brief generic ack
            // only. Never a navigation instruction, so it can't advance
            // frames on its own.
            acknowledgeContentAction();
          }
        } catch {
          sendToolOutput(
            call.call_id,
            JSON.stringify({ ok: false, error: "Invalid canvas action." }),
          );
        }
        return;
      }

      if (call.name === "present_walkthrough") {
        try {
          const args = JSON.parse(call.arguments) as {
            from_frame?: number;
            to_frame?: number;
          };
          const total = framesRef.current.length;
          const from = clampFrame(args.from_frame ?? 1, 1, total);
          const to = clampFrame(args.to_frame ?? total, from, total);
          walkthroughRef.current = { toFrame: to };

          const currentState = onActionRef.current({
            action: "goto",
            frame_number: from,
          });
          const frameLine = currentState.split("\n")[0];
          setActivity({ kind: "walkthrough", label: frameLine });
          sendToolOutput(
            call.call_id,
            JSON.stringify({
              ok: true,
              walkthrough: { from, to },
              protocol:
                "Explain only the frame now shown, then call control_canvas next to advance. Stay in sync — never explain a frame before it is shown.",
            }),
          );
          narrateCurrentFrame(frameLine, true);
        } catch {
          sendToolOutput(
            call.call_id,
            JSON.stringify({ ok: false, error: "Invalid walkthrough request." }),
          );
        }
        return;
      }

      if (call.name === "show_in_panel") {
        try {
          const request = JSON.parse(call.arguments) as PanelGenerateRequest;
          onPanelRequestRef.current?.(request);
          setActivity({ kind: "generating", label: `Creating ${request.type}` });
          // Ack immediately — generation runs independently and streams into
          // the panel, so we never block the model waiting for content.
          sendToolOutput(
            call.call_id,
            JSON.stringify({
              ok: true,
              status: "generating",
              note: "The panel is building this now; it will appear for the class shortly.",
            }),
          );
        } catch {
          sendToolOutput(
            call.call_id,
            JSON.stringify({ ok: false, error: "Invalid panel request." }),
          );
        }
      }
    },
    [acknowledgeContentAction, narrateCurrentFrame, sendToolOutput],
  );

  const handleServerEvent = useCallback(
    (event: RealtimeServerEvent) => {
      if (
        event.type === "response.output_item.done" &&
        event.item?.type === "function_call"
      ) {
        handleFunctionCall(event.item);
      }

      if (event.type === "response.function_call_arguments.done") {
        handleFunctionCall(event);
      }

      event.response?.output?.forEach((item) => {
        if (item.type === "function_call") {
          handleFunctionCall(item);
        }
      });

      // Captions: match text deltas AND audio-transcript deltas defensively,
      // since the exact event name differs across Realtime API versions.
      const type = event.type ?? "";
      if (
        typeof event.delta === "string" &&
        (type.endsWith("text.delta") || type.endsWith("transcript.delta"))
      ) {
        appendCaption(event.delta);
      }

      // The teacher started talking — drop any running walkthrough so the model
      // answers them instead of ploughing ahead.
      if (event.type === "input_audio_buffer.speech_started") {
        walkthroughRef.current = null;
        audioPlaybackActiveRef.current = false;
        setActivity({ kind: "listening", label: "Listening" });
      }

      // The AI's voice began playing out to the room. Keep the caption and the
      // "explaining"/"speaking" state pinned until playback actually stops.
      if (event.type === "output_audio_buffer.started") {
        audioPlaybackActiveRef.current = true;
        if (captionTimerRef.current) {
          clearTimeout(captionTimerRef.current);
          captionTimerRef.current = null;
        }
        setActivity((previous) =>
          previous?.kind === "walkthrough"
            ? previous
            : { kind: "explaining", label: "Explaining" },
        );
      }

      // Playback finished — the agent has truly stopped talking. Now let the
      // last caption linger briefly, then fade.
      if (event.type === "output_audio_buffer.stopped") {
        audioPlaybackActiveRef.current = false;
        captionBufferRef.current = "";
        fadeCaption(1200);
      }

      if (event.type === "response.done") {
        captionBufferRef.current = "";
        // Generation finished, but the voice is usually still playing. Only fade
        // now when nothing is playing (director/text-only responses); otherwise
        // output_audio_buffer.stopped owns the teardown so the caption and wave
        // stay live until the agent has actually finished speaking. If the
        // playback events never arrive (older API), this path still fires,
        // preserving the previous behaviour rather than hanging the caption.
        if (!audioPlaybackActiveRef.current) {
          fadeCaption(4000);
        }
      }
    },
    [appendCaption, fadeCaption, handleFunctionCall],
  );

  const connect = useCallback(async () => {
    if (status !== "idle" && status !== "error") {
      return;
    }

    setStatus("connecting");
    setError(null);
    playConnectionCue("connecting");

    const generation = ++connectGenerationRef.current;
    const abort = new AbortController();
    connectAbortRef.current = abort;
    /** True once this run has been cancelled or overtaken by a newer `connect()`. */
    const isStale = () => generation !== connectGenerationRef.current;

    try {
      const tokenResponse = await fetch("/api/openai/realtime/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvasId,
          canvasTitle,
          mode,
          frames: frames.map((frame) => ({
            frame_number: frame.index + 1,
            title: frame.title,
            block_types: getFrameBlockTypes(frame),
            searchable_content: frame.searchText.slice(0, 1200),
          })),
        }),
        signal: abort.signal,
      });
      if (isStale()) return;
      const tokenData = await tokenResponse.json();
      if (isStale()) return;

      if (!tokenResponse.ok) {
        throw new Error(tokenData.error ?? "Unable to connect the AI session.");
      }

      const ephemeralKey = tokenData.value ?? tokenData.client_secret?.value;
      if (!ephemeralKey) {
        throw new Error("Realtime client secret was missing.");
      }
      usageSessionIdRef.current = tokenData.usage_session_id ?? null;

      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;

      if (mode === "companion") {
        const audioElement = window.document.createElement("audio");
        audioElement.autoplay = true;
        audioElement.hidden = true;
        window.document.body.append(audioElement);
        remoteAudioRef.current = audioElement;
        peerConnection.ontrack = (event) => {
          audioElement.srcObject = event.streams[0];
          // Surface the stream too, so the visualizer reacts to the real voice.
          setRemoteAudioStream(event.streams[0] ?? null);
        };
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (isStale()) {
        // Cancelled while the mic permission prompt was up — nothing of
        // this run's was torn down yet, so release the mic now.
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }
      localStreamRef.current = mediaStream;
      mediaStream
        .getAudioTracks()
        .forEach((track) => peerConnection.addTrack(track, mediaStream));

      const dataChannel = peerConnection.createDataChannel("oai-events");
      dataChannelRef.current = dataChannel;
      dataChannel.addEventListener("message", (event) => {
        let parsed: RealtimeServerEvent;
        try {
          parsed = JSON.parse(event.data) as RealtimeServerEvent;
        } catch {
          return; // Genuinely malformed transport frame — nothing to do.
        }

        // Record token usage BEFORE any other handler runs.
        //
        // This ordering is load-bearing: `response.done` carries the model's
        // function calls in `response.output`, and dispatching those runs real
        // app code (canvas mutations, panel generation) that can throw. When
        // it did, the old catch-all swallowed the error AND skipped cost
        // tracking entirely — a session could burn real money and record
        // nothing, with no trace anywhere. Usage capture must never sit
        // downstream of code that can fail.
        if (parsed.type === "response.done") {
          try {
            trackRealtimeResponse(usageSessionIdRef.current, parsed.response);
          } catch (usageError) {
            console.error("[realtime usage] tracking threw:", usageError);
          }
        }

        try {
          handleServerEvent(parsed);
        } catch (handlerError) {
          // Never silent: a throw here previously vanished without a trace.
          console.error(
            `[realtime] handler failed for event "${parsed.type}":`,
            handlerError,
          );
        }
      });
      dataChannel.addEventListener("open", () => {
        setStatus("connected");
        hadConnectionRef.current = true;
        playConnectionCue("connected");
      });
      peerConnection.addEventListener("connectionstatechange", () => {
        if (
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "disconnected"
        ) {
          disconnect({ silent: true });
          setStatus("error");
          setError("The Realtime connection was interrupted.");
          playConnectionCue("error");
        }
      });

      const offer = await peerConnection.createOffer();
      if (isStale()) return;
      await peerConnection.setLocalDescription(offer);
      if (isStale()) return;
      const sdpResponse = await fetch(
        "https://api.openai.com/v1/realtime/calls",
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
          signal: abort.signal,
        },
      );
      if (isStale()) return;

      if (!sdpResponse.ok) {
        throw new Error("OpenAI Realtime connection failed.");
      }

      const answerSdp = await sdpResponse.text();
      if (isStale()) return;
      await peerConnection.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (unknownError) {
      // A cancelled `fetch` rejects with an AbortError — that's `isStale()`
      // by another name. Nothing to report: `disconnect()` already reset
      // status and cleaned up whatever this run had built so far.
      if (
        isStale() ||
        (unknownError instanceof DOMException && unknownError.name === "AbortError")
      ) {
        return;
      }

      finishRealtimeUsageSession(usageSessionIdRef.current, "failed");
      usageSessionIdRef.current = null;
      disconnect({ silent: true });
      setStatus("error");
      playConnectionCue("error");
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "The AI session could not connect.",
      );
    }
  }, [canvasId, canvasTitle, disconnect, frames, handleServerEvent, mode, status]);

  const togglePause = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }

    const shouldPause = status === "connected";
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !shouldPause;
    });
    if (remoteAudioRef.current) {
      if (shouldPause) {
        remoteAudioRef.current.pause();
      } else {
        void remoteAudioRef.current.play();
      }
    }
    setStatus(shouldPause ? "paused" : "connected");
    // Not `playConnectionCue("connected")` on the unpause branch — that cue
    // is reserved for the one real "we're live" moment, not every unmute.
    playMicCue(!shouldPause);
  }, [status]);

  return {
    activity,
    caption,
    connect,
    disconnect,
    error,
    isConnected: status === "connected" || status === "paused",
    isPaused: status === "paused",
    remoteAudioStream,
    status,
    syncFrameContext,
    togglePause,
  };
}

/** Pulls the frame number out of a "Frame N of M: Title" state string. */
function parseFrameNumber(state: string): number | null {
  const match = /frame\s+(\d+)\s+of\s+\d+/i.exec(state);
  return match ? Number(match[1]) : null;
}

function clampFrame(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}
