/**
 * Custom hook to register an RPC method handler on the local participant.
 * Uses a ref for the handler to avoid infinite re-registration on every render.
 * 
 * The handler receives parsed JSON payload from the agent and should return
 * a string response (or void). The hook automatically handles JSON parsing
 * of incoming string payloads.
 */

"use client";

import { useRoomContext } from "@livekit/components-react";
import { useEffect, useRef } from "react";
import type { RpcInvocationData } from "livekit-client";

const DEBUG_RPC = process.env.NEXT_PUBLIC_DEBUG_RPC === "1";
type RpcHandler = (payload: unknown) => Promise<string | void>;

function debugRpc(method: string, message: string, payload?: unknown) {
    if (!DEBUG_RPC) return;

    if (payload === undefined) {
        console.log(`[RPC] ${method} ${message}`);
        return;
    }

    console.log(`[RPC] ${method} ${message}`, payload);
}

export function useRpcHandler(method: string, handler: RpcHandler) {
    const room = useRoomContext();
    // Use a ref so we don't re-register every time handler identity changes
    const handlerRef = useRef(handler);

    // Track if we've successfully registered to avoid unregister/re-register cycles
    const registeredRef = useRef(false);

    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);


    useEffect(() => {
        if (!room || !room.localParticipant) {
            if (DEBUG_RPC) {
                console.warn(`[RPC] Cannot register "${method}" - room or localParticipant not ready`);
            }
            registeredRef.current = false;
            return;
        }

        // Only register once per method
        if (registeredRef.current) {
            debugRpc(method, "already registered, skipping re-registration");
            return;
        }

        const handleRpc = async (data: RpcInvocationData) => {
            debugRpc(method, "called");

            // Parse payload — agent sends JSON strings via perform_rpc
            let payload = data.payload;
            try {
                payload = JSON.parse(data.payload);
            } catch (e) {
                if (DEBUG_RPC) {
                    console.warn(`[RPC] "${method}" - payload is not JSON, using raw string`, e);
                }
            }

            try {
                const response = await handlerRef.current(payload);
                const result = JSON.stringify(response || { success: true });
                debugRpc(method, "completed successfully");
                return result;
            } catch (error) {
                console.error(`[RPC] "${method}" handler error:`, error);
                throw error;
            }
        };

        try {
            // registerRpcMethod returns void in current @livekit/components-react version
            room.localParticipant.registerRpcMethod(method, handleRpc);
            registeredRef.current = true;
            debugRpc(method, "registered");
        } catch (error) {
            console.error(`[RPC] ✗ Failed to register method "${method}":`, error);
            registeredRef.current = false;
        }

        // Return cleanup function to unregister the method only on unmount
        return () => {
            try {
                // Check if unregisterRpcMethod exists (it should on LocalParticipant)
                if (room.localParticipant && 'unregisterRpcMethod' in room.localParticipant) {
                    (room.localParticipant as { unregisterRpcMethod: (name: string) => void }).unregisterRpcMethod(method);
                    debugRpc(method, "unregistered");
                }
                registeredRef.current = false;
            } catch (error) {
                console.error(`[RPC] Failed to unregister method "${method}":`, error);
            }
        };
    }, [room, method]); // Keep both deps to detect changes, but only register once
}
