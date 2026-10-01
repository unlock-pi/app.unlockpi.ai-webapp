"use client";

import type { HighlightWord } from "@/features/talk/components/board-panel";
import type { CognitiveAnswer } from "@/features/classroom/components/cognitive-board";
import { applyOperation, createEmptyBoard } from "@/features/classroom/lib/board-engine";
import type { BoardDocument, BoardOperation } from "@/features/talk/lib/board";

export type ClassroomViewMode = "content" | "cognitive_test";

export interface ClassroomRealtimeState {
  boardText: string;
  boardHighlights: HighlightWord[];
  boardDocument: BoardDocument;
  focusedStudent: string | null;
  transcript: string[];
  viewMode: ClassroomViewMode;
  cognitiveQuestion: string;
  cognitiveAnswers: CognitiveAnswer[];
  teamScores: Record<string, number>;
}

export const DEFAULT_TEAM_SCORES: Record<string, number> = {
  "Team Alpha": 0,
  "Team Beta": 0,
  "Team Gamma": 0,
};

export function createInitialClassroomRealtimeState(): ClassroomRealtimeState {
  return {
    boardText:
      "The quick brown fox jumps over the lazy dog. Programming is fun, and Artificial Intelligence helps us learn faster.",
    boardHighlights: [],
    boardDocument: createEmptyBoard(),
    focusedStudent: null,
    transcript: [],
    viewMode: "content",
    cognitiveQuestion: "",
    cognitiveAnswers: [],
    teamScores: { ...DEFAULT_TEAM_SCORES },
  };
}

export type ClassroomRealtimeAction =
  | { type: "setBoardOperation"; operation: BoardOperation }
  | { type: "setBoardDocument"; document: BoardDocument }
  | { type: "setBoardText"; text: string }
  | { type: "setBoardHighlights"; highlights: HighlightWord[] }
  | { type: "clearBoard" }
  | { type: "setFocusedStudent"; studentName: string | null }
  | { type: "appendTranscript"; line: string }
  | { type: "setTranscript"; transcript: string[] }
  | { type: "startCognitiveTest"; question: string; answers: CognitiveAnswer[] }
  | { type: "revealCognitiveAnswer"; index: number }
  | { type: "setTeamScores"; scores: Record<string, number> }
  | { type: "reset" };

export function classroomRealtimeReducer(
  state: ClassroomRealtimeState,
  action: ClassroomRealtimeAction
): ClassroomRealtimeState {
  switch (action.type) {
    case "setBoardOperation":
      return {
        ...state,
        boardDocument: applyOperation(state.boardDocument, action.operation),
      };
    case "setBoardDocument":
      return {
        ...state,
        boardDocument: action.document,
        boardText: "",
        boardHighlights: [],
        viewMode: "content",
      };
    case "setBoardText":
      return {
        ...state,
        boardText: action.text,
        boardHighlights: [],
        boardDocument: createEmptyBoard(),
        viewMode: "content",
      };
    case "setBoardHighlights":
      return {
        ...state,
        boardHighlights: action.highlights,
        viewMode: "content",
      };
    case "clearBoard":
      return {
        ...state,
        boardText: "",
        boardHighlights: [],
        boardDocument: createEmptyBoard(),
        viewMode: "content",
      };
    case "setFocusedStudent":
      return {
        ...state,
        focusedStudent: action.studentName,
      };
    case "appendTranscript":
      return {
        ...state,
        transcript: [...state.transcript, action.line],
      };
    case "setTranscript":
      return {
        ...state,
        transcript: action.transcript,
      };
    case "startCognitiveTest":
      return {
        ...state,
        cognitiveQuestion: action.question,
        cognitiveAnswers: action.answers,
        viewMode: "cognitive_test",
      };
    case "revealCognitiveAnswer":
      return {
        ...state,
        cognitiveAnswers: state.cognitiveAnswers.map((answer, index) =>
          index === action.index ? { ...answer, revealed: true } : answer
        ),
      };
    case "setTeamScores":
      return {
        ...state,
        teamScores: action.scores,
      };
    case "reset":
      return createInitialClassroomRealtimeState();
    default:
      return state;
  }
}
