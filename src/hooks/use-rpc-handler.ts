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

export function useRpcHandler(method: string, handler: (payload: any) => Promise<string | void>) {
    const room = useRoomContext();
    // Use a ref so we don't re-register every time handler identity changes
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    // Track if we've successfully registered to avoid unregister/re-register cycles
    const registeredRef = useRef(false);


    useEffect(() => {
        if (!room || !room.localParticipant) {
            console.warn(`[RPC] Cannot register "${method}" - room or localParticipant not ready`);
            registeredRef.current = false;
            return;
        }

        // Only register once per method
        if (registeredRef.current) {
            console.log(`[RPC] ${method} already registered, skipping re-registration`);
            return;
        }

        const handleRpc = async (data: RpcInvocationData) => {
            console.log(`[RPC] "${method}" called with payload:`, data.payload);

            // Parse payload — agent sends JSON strings via perform_rpc
            let payload = data.payload;
            try {
                payload = JSON.parse(data.payload);
            } catch (e) {
                console.warn(`[RPC] "${method}" - payload is not JSON, using raw string`, e);
            }

            try {
                const response = await handlerRef.current(payload);
                const result = JSON.stringify(response || { success: true });
                console.log(`[RPC] "${method}" completed successfully`);
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
            console.log(`[RPC] ✓ Method registered: ${method}`);
        } catch (error) {
            console.error(`[RPC] ✗ Failed to register method "${method}":`, error);
            registeredRef.current = false;
        }

        // Return cleanup function to unregister the method only on unmount
        return () => {
            try {
                // Check if unregisterRpcMethod exists (it should on LocalParticipant)
                if (room.localParticipant && 'unregisterRpcMethod' in room.localParticipant) {
                    (room.localParticipant as any).unregisterRpcMethod(method);
                    console.log(`[RPC] Method unregistered: ${method}`);
                }
                registeredRef.current = false;
            } catch (error) {
                console.error(`[RPC] Failed to unregister method "${method}":`, error);
            }
        };
    }, [room, method]); // Keep both deps to detect changes, but only register once
}
