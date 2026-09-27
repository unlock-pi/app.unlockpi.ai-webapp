"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import useSound from "use-sound";

import { useRpcHandler } from "@/features/talk/hooks/use-rpc-handler";
import type { BoardDocument, BoardOperation } from "@/features/talk/lib/board";
import type { HighlightWord } from "@/features/talk/components/board-panel";
import type { CognitiveAnswer } from "@/features/classroom/components/cognitive-board";
import { classroomRealtimeReducer, createInitialClassroomRealtimeState } from "../lib/classroom-state";

// import {
//   classroomRealtimeReducer,
//   createInitialClassroomRealtimeState,
// } from "./classroom-state";

type LegacyHighlight = HighlightWord;

function isBoardOperation(payload: unknown): payload is BoardOperation {
  return typeof payload === "object" && payload !== null && "type" in payload;
}

function hasBlocks(
  payload: unknown
): payload is { blocks: unknown[]; id?: string; version?: number } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    Array.isArray((payload as { blocks?: unknown[] }).blocks)
  );
}

function toBoardDocument(payload: {
  blocks: unknown[];
  id?: string;
  version?: number;
}): BoardDocument {
  return {
    id: payload.id ?? "board-1",
    version: payload.version ?? 0,
    blocks: payload.blocks as BoardDocument["blocks"],
  };
}

function hasText(payload: unknown): payload is { text: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { text?: unknown }).text === "string"
  );
}

function hasHighlightWords(payload: unknown): payload is { words: LegacyHighlight[] } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    Array.isArray((payload as { words?: unknown[] }).words)
  );
}

function hasStudentName(payload: unknown): payload is { studentName: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { studentName?: unknown }).studentName === "string"
  );
}

function hasScores(payload: unknown): payload is { scores: Record<string, number> } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { scores?: unknown }).scores === "object" &&
    (payload as { scores?: unknown }).scores !== null
  );
}

function hasTranscriptLine(payload: unknown): payload is { text: string } {
  return hasText(payload);
}

function hasCognitiveTestPayload(
  payload: unknown
): payload is {
  question: string;
  answers: Array<{ text: string; percentage: number }>;
} {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { question?: unknown }).question === "string" &&
    Array.isArray((payload as { answers?: unknown[] }).answers)
  );
}

function hasRevealIndex(payload: unknown): payload is { index: number } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { index?: unknown }).index === "number"
  );
}

export function useClassroomRealtime() {
  const [state, dispatch] = useReducer(
    classroomRealtimeReducer,
    undefined,
    createInitialClassroomRealtimeState
  );
  const focusTimeoutRef = useRef<number | null>(null);
  const [playReveal] = useSound("/reveal.mp3", { volume: 0.5 });
  const [playBuzzer] = useSound("/buzzer.mp3", { volume: 0.5 });

  const setFocusedStudent = useCallback((studentName: string | null) => {
    if (focusTimeoutRef.current) {
      window.clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }

    dispatch({ type: "setFocusedStudent", studentName });

    if (studentName) {
      focusTimeoutRef.current = window.setTimeout(() => {
        dispatch({ type: "setFocusedStudent", studentName: null });
        focusTimeoutRef.current = null;
      }, 5000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        window.clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  useRpcHandler("board_operation", async (payload) => {
    if (isBoardOperation(payload)) {
      dispatch({ type: "setBoardOperation", operation: payload });
    }
  });

  useRpcHandler("set_board", async (payload) => {
    if (hasBlocks(payload)) {
      dispatch({ type: "setBoardDocument", document: toBoardDocument(payload) });
    }
  });

  useRpcHandler("update_content", async (payload) => {
    if (hasText(payload)) {
      dispatch({ type: "setBoardText", text: payload.text });
    }
  });

  useRpcHandler("highlight_text", async (payload) => {
    if (hasHighlightWords(payload)) {
      dispatch({ type: "setBoardHighlights", highlights: payload.words });
    }
  });

  useRpcHandler("clear_board", async () => {
    dispatch({ type: "clearBoard" });
  });

  useRpcHandler("show_student_focus", async (payload) => {
    if (hasStudentName(payload)) {
      setFocusedStudent(payload.studentName);
    }
  });

  useRpcHandler("start_cognitive_test", async (payload) => {
    if (hasCognitiveTestPayload(payload)) {
      const answers: CognitiveAnswer[] = payload.answers.map((answer) => ({
        text: answer.text,
        percentage: answer.percentage,
        revealed: false,
      }));
      dispatch({
        type: "startCognitiveTest",
        question: payload.question,
        answers,
      });
    }
  });

  useRpcHandler("reveal_answer", async (payload) => {
    if (hasRevealIndex(payload)) {
      dispatch({ type: "revealCognitiveAnswer", index: payload.index });
      playReveal();
    }
  });

  useRpcHandler("update_scores", async (payload) => {
    if (hasScores(payload)) {
      dispatch({ type: "setTeamScores", scores: payload.scores });
    }
  });

  useRpcHandler("show_error_buzzer", async () => {
    playBuzzer();
  });

  useRpcHandler("update_transcript", async (payload) => {
    if (hasTranscriptLine(payload)) {
      dispatch({ type: "appendTranscript", line: payload.text });
    }
  });

  return state;
}
