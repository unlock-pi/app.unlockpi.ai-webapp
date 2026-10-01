"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { OpenAIRealtimeClient } from "@/lib/openai-realtime/realtime-client";
import type {
  RealtimeStatus,
  RealtimeToolCall,
} from "@/lib/openai-realtime/types";

type UseOpenAIRealtimeArgs = {
  tokenEndpoint: string;
  tokenBody?: Record<string, unknown>;
  onToolCall: (call: RealtimeToolCall) => string;
};

/**
 * React binding for OpenAIRealtimeClient. All the WebRTC logic lives in the
 * plain class (realtime-client.ts) — this hook just keeps `status`/`error`
 * as React state and makes sure `onToolCall` always sees the latest render's
 * closures, without having to reconnect every time it changes.
 */
export function useOpenAIRealtime({
  tokenEndpoint,
  tokenBody,
  onToolCall,
}: UseOpenAIRealtimeArgs) {
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const onToolCallRef = useRef(onToolCall);
  const clientRef = useRef<OpenAIRealtimeClient | null>(null);

  useEffect(() => {
    onToolCallRef.current = onToolCall;
  }, [onToolCall]);

  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = new OpenAIRealtimeClient({
        tokenEndpoint,
        tokenBody,
        onStatusChange: setStatus,
        onError: setError,
        onToolCall: (call: RealtimeToolCall) => onToolCallRef.current(call),
      });
    }
    return clientRef.current;
  }, [tokenEndpoint, tokenBody]);

  const connect = useCallback(async () => {
    setError(null);
    await getClient().connect();
  }, [getClient]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  const updateInstructions = useCallback((instructions: string) => {
    clientRef.current?.updateInstructions(instructions);
  }, []);

  useEffect(() => {
    return () => clientRef.current?.disconnect();
  }, []);

  return {
    status,
    error,
    isConnected: status === "connected",
    connect,
    disconnect,
    updateInstructions,
  };
}
