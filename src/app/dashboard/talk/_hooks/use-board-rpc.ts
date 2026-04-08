"use client";
import { useState } from "react";
import { useRpcHandler } from "@/hooks/use-rpc-handler";
import { useBoardState } from "./use-board-state";
import type { BoardDocument, BoardOperation } from "@/types/board";
import type { VisualPayload } from "@/types/visual";
import { parseVisualPayload } from "@/types/visual";

const DEBUG_RPC = process.env.NEXT_PUBLIC_DEBUG_RPC === "1";
type LegacyHighlight = { word: string; type: string; positions: number[] };

function isBoardOperation(payload: unknown): payload is BoardOperation {
    return typeof payload === "object" && payload !== null && "type" in payload;
}

function hasBlocks(payload: unknown): payload is { blocks: unknown[]; id?: string; version?: number } {
    return typeof payload === "object" && payload !== null && Array.isArray((payload as { blocks?: unknown[] }).blocks);
}

function toBoardDocument(payload: { blocks: unknown[]; id?: string; version?: number }): BoardDocument {
    return {
        id: payload.id ?? "board-1",
        version: payload.version ?? 0,
        blocks: payload.blocks as BoardDocument["blocks"],
    };
}

function hasText(payload: unknown): payload is { text: string } {
    return typeof payload === "object" && payload !== null && typeof (payload as { text?: unknown }).text === "string";
}

function hasHighlightWords(payload: unknown): payload is { words: LegacyHighlight[] } {
    return typeof payload === "object" && payload !== null && Array.isArray((payload as { words?: unknown[] }).words);
}

export function useBoardRPC() {
    // ── Legacy Board State (markdown content + word-level highlights) ──
    const [boardText, setBoardText] = useState("");
    const [boardHighlights, setBoardHighlights] = useState<LegacyHighlight[]>([]);
    const [visualPayload, setVisualPayload] = useState<VisualPayload | null>(null);

    // ── New Structured Board State ──
    const { boardDocument, dispatch } = useBoardState();

    // ── New RPC: board_operation — receives a single BoardOperation ──
    useRpcHandler("board_operation", async (payload) => {
        if (DEBUG_RPC) console.log("[RPC] board_operation");
        if (isBoardOperation(payload)) {
            dispatch(payload);
        }
        return JSON.stringify({ success: true });
    });

    // ── New RPC: set_board — full board replacement ──
    useRpcHandler("set_board", async (payload) => {
        if (DEBUG_RPC) console.log("[RPC] set_board");
        if (hasBlocks(payload)) {
            dispatch({ type: "setBoard", document: toBoardDocument(payload) });
            // Clear legacy state when structured board is active
            setBoardText("");
            setBoardHighlights([]);
            setVisualPayload(null);
        }
        return JSON.stringify({ success: true });
    });

    // ── Legacy RPC: update_content (markdown string) ──
    useRpcHandler("update_content", async (payload) => {
        if (DEBUG_RPC) console.log("[RPC] update_content");
        if (hasText(payload)) {
            setBoardText(payload.text);
            setBoardHighlights([]);
            setVisualPayload(null);
        }
        return JSON.stringify({ success: true });
    });

    // ── Legacy RPC: highlight_text (word-level highlights) ──
    useRpcHandler("highlight_text", async (payload) => {
        if (DEBUG_RPC) console.log("[RPC] highlight_text");
        if (hasHighlightWords(payload)) {
            setBoardHighlights(payload.words);
        }
        return JSON.stringify({ success: true });
    });

    // RPC: clear_board — clears both legacy and structured board
    useRpcHandler("clear_board", async () => {
        if (DEBUG_RPC) console.log("[RPC] clear_board");
        setBoardText("");
        setBoardHighlights([]);
        setVisualPayload(null);
        dispatch({ type: "setBoard", document: { id: "board-1", version: 0, blocks: [] } });
        return JSON.stringify({ success: true });
    });

    // RPC: render_visual — strict schema-driven visuals
    useRpcHandler("render_visual", async (payload) => {
        if (DEBUG_RPC) console.log("[RPC] render_visual");
        const parsed = parseVisualPayload(payload);
        if (parsed) {
            setVisualPayload(parsed);
            setBoardText("");
            setBoardHighlights([]);
            dispatch({ type: "setBoard", document: { id: "board-1", version: 0, blocks: [] } });
        }
        return JSON.stringify({ success: true });
    });

    // RPC: show_student_focus — no-op on talk page
    useRpcHandler("show_student_focus", async () => {
        if (DEBUG_RPC) console.log("[RPC] show_student_focus (ignored on talk page)");
        return JSON.stringify({ success: true });
    });

    return { boardText, boardHighlights, boardDocument, visualPayload };
}
