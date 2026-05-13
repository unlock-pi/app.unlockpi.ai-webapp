"use client";

import { useClassroomRealtime } from "@/features/classroom/hooks/use-classroom-realtime";


export function useBoardRPC() {
    const classroomRealtime = useClassroomRealtime();

    return {
        boardText: classroomRealtime.boardText,
        boardHighlights: classroomRealtime.boardHighlights,
        boardDocument: classroomRealtime.boardDocument,
    };
}
