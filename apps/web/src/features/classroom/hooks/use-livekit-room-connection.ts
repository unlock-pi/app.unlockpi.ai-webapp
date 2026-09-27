"use client";

import { useCallback, useMemo, useState } from "react";

interface UseLiveKitRoomConnectionOptions {
  room: string;
  username: string;
  sessionId?: string | null;
  autoConnect?: boolean;
}

export function useLiveKitRoomConnection({
  room,
  username,
  sessionId,
}: UseLiveKitRoomConnectionOptions) {
  const [token, setToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentWarning, setAgentWarning] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const searchParams = new URLSearchParams({ room, username });
    if (sessionId) {
      searchParams.set("session_id", sessionId);
    }
    return searchParams.toString();
  }, [room, username, sessionId]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setAgentWarning(null);
    try {
      const response = await fetch(`/api/token?${queryString}`);
      const data = (await response.json()) as {
        accessToken?: string;
        error?: string;
        agentDispatched?: boolean;
        agentDispatchError?: string;
      };
      if (data.error) {
        setError(data.error);
        setIsConnecting(false);
        return;
      }

      if (data.agentDispatched === false) {
        setAgentWarning(
          data.agentDispatchError ??
            "The AI tutor could not join this room. Try reconnecting.",
        );
      }

      setToken(data.accessToken ?? "");
      setIsConnecting(false);
    } catch {
      setError("Failed to connect. Is the server running?");
      setIsConnecting(false);
    }
  }, [queryString]);

  const disconnect = useCallback(() => {
    setToken("");
    setIsConnecting(false);
    setError(null);
    setAgentWarning(null);
  }, []);

  return { token, isConnecting, error, agentWarning, connect, disconnect };
}
