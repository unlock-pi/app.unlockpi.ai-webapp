"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  finishRealtimeUsageSession,
  trackRealtimeResponse,
} from "@/features/realtime/lib/realtime-usage-client";
import type { RealtimeUsageResponse } from "@/features/realtime/types/realtime-usage";

type ArrayRealtimeStatus = "idle" | "connecting" | "connected" | "muted" | "error";
export type ArrayRealtimeConnectionMode = "audio" | "listen_only";

export type ArrayRealtimeUiAction =
  | { action: "next" }
  | { action: "previous" }
  | { action: "goto"; frame_index?: number }
  | { action: "highlight_index"; index?: number; caption?: string }
  | { action: "highlight_indices"; caption?: string }
  | { action: "highlight_elements"; caption?: string }
  | { action: "set_array"; values?: string[]; index?: number; caption?: string }
  | { action: "set_array_name"; array_name?: string; caption?: string }
  | { action: "show_indices"; caption?: string }
  | { action: "hide_indices"; caption?: string }
  | { action: "set_caption"; caption?: string }
  | { action: "reset_array" };

type UseArrayRealtimeTutorArgs = {
  lessonTitle: string;
  lessonGoal: string;
  onUiAction: (action: ArrayRealtimeUiAction) => string;
};

type RealtimeServerEvent = {
  type?: string;
  item?: {
    type?: string;
    name?: string;
    arguments?: string;
    call_id?: string;
  };
  name?: string;
  arguments?: string;
  call_id?: string;
  response?: RealtimeUsageResponse & {
    output?: Array<{
      type?: string;
      name?: string;
      arguments?: string;
      call_id?: string;
    }>;
  };
};

export function useArrayRealtimeTutor({
  lessonTitle,
  lessonGoal,
  onUiAction,
}: UseArrayRealtimeTutorArgs) {
  const [status, setStatus] = useState<ArrayRealtimeStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] =
    useState<ArrayRealtimeConnectionMode | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const handledCallIdsRef = useRef(new Set<string>());
  const latestScreenContextRef = useRef("");
  const onUiActionRef = useRef(onUiAction);
  const connectionModeRef = useRef<ArrayRealtimeConnectionMode | null>(null);
  const usageSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    onUiActionRef.current = onUiAction;
  }, [onUiAction]);

  const stop = useCallback(() => {
    finishRealtimeUsageSession(usageSessionIdRef.current);
    usageSessionIdRef.current = null;
    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    peerConnectionRef.current?.getSenders().forEach((sender) => {
      sender.track?.stop();
    });
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
    connectionModeRef.current = null;
    setConnectionMode(null);
    setStatus("idle");
  }, []);

  useEffect(() => stop, [stop]);

  const sendClientEvent = useCallback((event: Record<string, unknown>) => {
    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== "open") {
      return;
    }

    channel.send(
      JSON.stringify({
        event_id: crypto.randomUUID(),
        ...event,
      })
    );
  }, []);

  const sendToolOutput = useCallback(
    (callId: string | undefined, output: string, createFollowupResponse = false) => {
      if (!callId) {
        return;
      }

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output,
        },
      });

      if (createFollowupResponse) {
        sendClientEvent({
          type: "response.create",
          response: {
            instructions: "Briefly explain the updated screen state.",
          },
        });
      }
    },
    [sendClientEvent]
  );

  const syncScreenContext = useCallback(
    (screenContext: string) => {
      latestScreenContextRef.current = screenContext;

      if (status !== "connected" && status !== "muted") {
        return;
      }

      sendClientEvent({
        type: "session.update",
        session: {
          type: "realtime",
          instructions: buildLiveInstructions(lessonTitle, lessonGoal, screenContext),
        },
      });
    },
    [lessonGoal, lessonTitle, sendClientEvent, status]
  );

  const handleFunctionCall = useCallback(
    (name: string | undefined, rawArguments: string | undefined, callId: string | undefined) => {
      if (name !== "control_array_lesson" || !rawArguments) {
        return;
      }

      const callKey = callId ?? `${name}:${rawArguments}`;
      if (handledCallIdsRef.current.has(callKey)) {
        return;
      }
      handledCallIdsRef.current.add(callKey);

      try {
        const parsed = JSON.parse(rawArguments) as ArrayRealtimeUiAction;
        const screenContext = onUiActionRef.current(parsed);
        syncScreenContext(screenContext);
        sendToolOutput(
          callId,
          JSON.stringify({
            ok: true,
            applied: parsed.action,
            current_screen: screenContext,
          }),
          connectionModeRef.current === "audio"
        );
      } catch {
        sendToolOutput(callId, JSON.stringify({ ok: false, error: "Invalid UI action JSON." }));
      }
    },
    [sendToolOutput, syncScreenContext]
  );

  const handleServerEvent = useCallback(
    (event: RealtimeServerEvent) => {
      if (event.type === "response.output_item.done" && event.item?.type === "function_call") {
        handleFunctionCall(event.item.name, event.item.arguments, event.item.call_id);
      }

      if (event.type === "response.function_call_arguments.done") {
        handleFunctionCall(event.name, event.arguments, event.call_id);
      }

      event.response?.output?.forEach((item) => {
        if (item.type === "function_call") {
          handleFunctionCall(item.name, item.arguments, item.call_id);
        }
      });

      if (event.type === "response.done") {
        trackRealtimeResponse(usageSessionIdRef.current, event.response);
      }
    },
    [handleFunctionCall]
  );

  const start = useCallback(async (mode: ArrayRealtimeConnectionMode = "audio") => {
    if (status === "connecting" || status === "connected" || status === "muted") {
      return;
    }

    setStatus("connecting");
    setError(null);
    connectionModeRef.current = mode;
    setConnectionMode(mode);

    try {
      const tokenResponse = await fetch("/api/openai/realtime/arrays", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lessonTitle, lessonGoal, responseMode: mode }),
      });
      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(tokenData.error ?? "Unable to create Realtime session.");
      }

      const ephemeralKey = tokenData.value ?? tokenData.client_secret?.value;
      if (!ephemeralKey) {
        throw new Error("Realtime client secret was missing from the server response.");
      }
      usageSessionIdRef.current = tokenData.usage_session_id ?? null;

      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;

      if (mode === "audio") {
        const audioElement = document.createElement("audio");
        audioElement.autoplay = true;
        audioElement.hidden = true;
        document.body.append(audioElement);
        remoteAudioRef.current = audioElement;
        peerConnection.ontrack = (event) => {
          audioElement.srcObject = event.streams[0];
        };
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = mediaStream;
      mediaStream.getAudioTracks().forEach((track) => {
        peerConnection.addTrack(track, mediaStream);
      });

      const dataChannel = peerConnection.createDataChannel("oai-events");
      dataChannelRef.current = dataChannel;
      dataChannel.addEventListener("message", (event) => {
        try {
          handleServerEvent(JSON.parse(event.data) as RealtimeServerEvent);
        } catch {
          // Ignore malformed diagnostic events.
        }
      });
      dataChannel.addEventListener("open", () => {
        setStatus("connected");
        sendClientEvent({
          type: "session.update",
          session: {
            type: "realtime",
            instructions: buildLiveInstructions(
              lessonTitle,
              lessonGoal,
              latestScreenContextRef.current
            ),
          },
        });
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpResponse.ok) {
        throw new Error("OpenAI Realtime SDP negotiation failed.");
      }

      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: await sdpResponse.text(),
      });
    } catch (unknownError) {
      finishRealtimeUsageSession(usageSessionIdRef.current, "failed");
      usageSessionIdRef.current = null;
      stop();
      setStatus("error");
      setError(unknownError instanceof Error ? unknownError.message : "Realtime connection failed.");
    }
  }, [handleServerEvent, lessonGoal, lessonTitle, sendClientEvent, status, stop]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }

    const shouldMute = status === "connected";
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !shouldMute;
    });
    setStatus(shouldMute ? "muted" : "connected");
  }, [status]);

  return {
    status,
    error,
    connectionMode,
    start,
    stop,
    toggleMute,
    syncScreenContext,
    isConnected: status === "connected" || status === "muted",
    isMuted: status === "muted",
  };
}

function buildLiveInstructions(lessonTitle: string, lessonGoal: string, screenContext: string) {
  return [
    "You are UnlockPi's interactive Arrays tutor.",
    "The learner is speaking while looking at the Arrays lesson UI.",
    "Always use CURRENT SCREEN STATE as the truth. If the screen changed, explain the new screen, not the previous one.",
    "Use control_array_lesson for UI requests.",
    "Use highlight_indices when the learner asks to show all indexes/indices.",
    "Use highlight_elements when the learner asks to show all elements, boxes, values, or the array.",
    "Use show_indices when the learner asks to show index numbers, and hide_indices when they ask to hide them.",
    "Use set_array_name when the learner asks to rename the array.",
    "Use set_caption when the learner asks for an explanation of the current screen.",
    "Keep captions short and directly tied to the visible array.",
    `Lesson: ${lessonTitle}.`,
    `Goal: ${lessonGoal}.`,
    "CURRENT SCREEN STATE:",
    screenContext || "The screen context has not arrived yet.",
  ].join("\n");
}
