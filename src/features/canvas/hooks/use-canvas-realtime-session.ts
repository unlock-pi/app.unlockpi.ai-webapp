"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getFrameBlockTypes,
  type CanvasPresentationFrame,
} from "@/features/canvas/lib/canvas-presentation";
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

type RealtimeFunctionCall = {
  arguments?: string;
  call_id?: string;
  name?: string;
  type?: string;
};

type RealtimeServerEvent = RealtimeFunctionCall & {
  item?: RealtimeFunctionCall;
  response?: RealtimeUsageResponse & { output?: RealtimeFunctionCall[] };
};

type UseCanvasRealtimeSessionArgs = {
  canvasTitle: string;
  canvasId?: string | null;
  frames: CanvasPresentationFrame[];
  mode: CanvasRealtimeMode;
  onAction: (action: CanvasRealtimeAction) => string;
};

export function useCanvasRealtimeSession({
  canvasTitle,
  canvasId,
  frames,
  mode,
  onAction,
}: UseCanvasRealtimeSessionArgs) {
  const [status, setStatus] = useState<CanvasRealtimeStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const handledCallIdsRef = useRef(new Set<string>());
  const onActionRef = useRef(onAction);
  const modeRef = useRef(mode);
  const usageSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

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

      if (modeRef.current === "companion") {
        sendEvent({
          type: "response.create",
          response: {
            instructions:
              "Briefly acknowledge the visual change, then continue helping the teacher.",
          },
        });
      }
    },
    [sendEvent],
  );

  const handleFunctionCall = useCallback(
    (call: RealtimeFunctionCall) => {
      if (call.name !== "control_canvas" || !call.arguments) {
        return;
      }

      const callKey = call.call_id ?? `${call.name}:${call.arguments}`;
      if (handledCallIdsRef.current.has(callKey)) {
        return;
      }
      handledCallIdsRef.current.add(callKey);

      try {
        const action = JSON.parse(call.arguments) as CanvasRealtimeAction;
        const currentState = onActionRef.current(action);
        sendToolOutput(
          call.call_id,
          JSON.stringify({ ok: true, current_state: currentState }),
        );
      } catch {
        sendToolOutput(
          call.call_id,
          JSON.stringify({ ok: false, error: "Invalid canvas action." }),
        );
      }
    },
    [sendToolOutput],
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

      if (event.type === "response.done") {
        trackRealtimeResponse(usageSessionIdRef.current, event.response);
      }
    },
    [handleFunctionCall],
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
