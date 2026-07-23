"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getFrameBlockTypes,
  type CanvasPresentationFrame,
} from "@/features/canvas/lib/canvas-presentation";
import type { PanelGenerateRequest } from "@/features/canvas/lib/panel-generation";
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
    | "clear_array_highlight";
  frame_number?: number;
  index?: number;
  length?: number;
  query?: string;
  title?: string;
  values?: string[];
};

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
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
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

  const disconnect = useCallback(() => {
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
    captionBufferRef.current = "";
    if (captionTimerRef.current) {
      clearTimeout(captionTimerRef.current);
      captionTimerRef.current = null;
    }
    setCaption("");
    setActivity(null);
    setError(null);
    setStatus("idle");
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
          const frameLine = currentState.split("\n")[0];
          sendToolOutput(
            call.call_id,
            JSON.stringify({ ok: true, current_state: currentState }),
          );

          // If a walkthrough is running and we've reached the last frame, stop
          // pacing so the model wraps up instead of looping forever.
          const inWalkthrough = walkthroughRef.current !== null;
          const frameNumber = parseFrameNumber(currentState);
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

          // Narrate the shown frame in a walkthrough (either mode), or after
          // any nav in Co-teacher mode. Copilot stays silent otherwise.
          if (inWalkthrough || modeRef.current === "companion") {
            narrateCurrentFrame(frameLine, inWalkthrough);
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
    [narrateCurrentFrame, sendToolOutput],
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
        setActivity({ kind: "listening", label: "Listening" });
      }

      if (event.type === "response.done") {
        trackRealtimeResponse(usageSessionIdRef.current, event.response);
        // Let the finished caption linger, then fade. A new response's deltas
        // clear this timer and start a fresh caption.
        captionBufferRef.current = "";
        if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
        captionTimerRef.current = setTimeout(() => {
          setCaption("");
          setActivity((previous) =>
            previous?.kind === "walkthrough" ? previous : null,
          );
        }, 4000);
      }
    },
    [appendCaption, handleFunctionCall],
  );

  const connect = useCallback(async () => {
    if (status !== "idle" && status !== "error") {
      return;
    }

    setStatus("connecting");
    setError(null);

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
      });
      const tokenData = await tokenResponse.json();

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
        };
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = mediaStream;
      mediaStream
        .getAudioTracks()
        .forEach((track) => peerConnection.addTrack(track, mediaStream));

      const dataChannel = peerConnection.createDataChannel("oai-events");
      dataChannelRef.current = dataChannel;
      dataChannel.addEventListener("message", (event) => {
        try {
          handleServerEvent(JSON.parse(event.data) as RealtimeServerEvent);
        } catch {
          // Ignore malformed diagnostic events from the transport.
        }
      });
      dataChannel.addEventListener("open", () => setStatus("connected"));
      peerConnection.addEventListener("connectionstatechange", () => {
        if (
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "disconnected"
        ) {
          disconnect();
          setStatus("error");
          setError("The Realtime connection was interrupted.");
        }
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      const sdpResponse = await fetch(
        "https://api.openai.com/v1/realtime/calls",
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
        },
      );

      if (!sdpResponse.ok) {
        throw new Error("OpenAI Realtime connection failed.");
      }

      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: await sdpResponse.text(),
      });
    } catch (unknownError) {
      finishRealtimeUsageSession(usageSessionIdRef.current, "failed");
      usageSessionIdRef.current = null;
      disconnect();
      setStatus("error");
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
  }, [status]);

  return {
    activity,
    caption,
    connect,
    disconnect,
    error,
    isConnected: status === "connected" || status === "paused",
    isPaused: status === "paused",
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
