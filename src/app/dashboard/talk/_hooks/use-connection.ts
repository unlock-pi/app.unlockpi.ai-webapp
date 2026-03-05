"use client";

import { useCallback, useState } from "react";

export function useConnection() {
    const [token, setToken] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const connect = useCallback(async () => {
        setIsConnecting(true);
        setError(null);
        try {
            const resp = await fetch(
                `/api/token?room=classroom-101&username=teacher-interface`
            );
            const data = await resp.json();
            if (data.error) {
                setError(data.error);
                setIsConnecting(false);
                return;
            }
            setToken(data.accessToken);
        } catch (e) {
            setError("Failed to connect. Is the server running?");
            setIsConnecting(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        setToken("");
        setIsConnecting(false);
        setError(null);
    }, []);

    return { token, isConnecting, error, connect, disconnect };
}
