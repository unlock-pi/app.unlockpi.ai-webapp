"use client";

import { useState } from "react";
import { useRpcHandler } from "@/hooks/use-rpc-handler";

export function useBoardRPC() {
    // ── Board State (markdown content + highlight words from agent) ──
    // boardText: markdown string the agent wants rendered on the board
    // boardHighlights: word-level highlights (styles handled by BoardPanel)
    const [boardText, setBoardText] = useState("");
    const [boardHighlights, setBoardHighlights] = useState<
        { word: string; type: string; positions: number[] }[]
    >([]);

    // RPC: update_content — matches the agent's perform_rpc(method="update_content")
    // Agent sends { text: "The quick brown fox..." }
    useRpcHandler("update_content", async (payload: any) => {
        console.log("[RPC] update_content:", payload);
        if (payload.text !== undefined) {
            setBoardText(payload.text);
            setBoardHighlights([]); // Clear old highlights when text changes
        }
        return JSON.stringify({ success: true });
    });

    // RPC: highlight_text — agent sends { words: [{ word, type, positions }] }
    useRpcHandler("highlight_text", async (payload: any) => {
        console.log("[RPC] highlight_text:", payload);
        if (payload.words) {
            setBoardHighlights(payload.words);
        }
        return JSON.stringify({ success: true });
    });

    // RPC: clear_board — agent clears both text and highlights
    useRpcHandler("clear_board", async () => {
        console.log("[RPC] clear_board");
        setBoardText("");
        setBoardHighlights([]);
        return JSON.stringify({ success: true });
    });

    // RPC: show_student_focus — no-op on talk page (no seating matrix here)
    // Registered so the agent doesn't get "Method not supported" errors
    useRpcHandler("show_student_focus", async (payload: any) => {
        console.log("[RPC] show_student_focus (ignored on talk page):", payload);
        return JSON.stringify({ success: true });
    });

    return { boardText, boardHighlights };
}
