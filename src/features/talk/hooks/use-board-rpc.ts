"use client";

import { useState } from "react";
import { useClassroomRealtime } from "@/features/classroom/hooks/use-classroom-realtime";
import { useRpcHandler } from "@/features/talk/hooks/use-rpc-handler";
import type { VisualPayload } from "@/types/visual";
import { parseVisualPayload } from "@/types/visual";


export function useBoardRPC() {
    const classroomRealtime = useClassroomRealtime();
    const [visualPayload, setVisualPayload] = useState<VisualPayload | null>(null);

    useRpcHandler("render_visual", async (payload) => {
        const parsed = parseVisualPayload(payload);
        if (parsed) {
            setVisualPayload(parsed);
        }
    });

    return {
        boardText: classroomRealtime.boardText,
        boardHighlights: classroomRealtime.boardHighlights,
        boardDocument: classroomRealtime.boardDocument,
        visualPayload,
    };
}
