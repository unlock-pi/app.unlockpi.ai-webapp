"use client";

import { useReducer, useCallback } from "react";
import type { BoardDocument, BoardOperation } from "@/types/board";
import { applyOperation, createEmptyBoard } from "@/lib/board-engine";

function boardReducer(state: BoardDocument, action: BoardOperation): BoardDocument {
  return applyOperation(state, action);
}

export function useBoardState() {
  const [boardDocument, dispatch] = useReducer(boardReducer, undefined, createEmptyBoard);

  const dispatchOperation = useCallback(
    (op: BoardOperation) => dispatch(op),
    []
  );

  return { boardDocument, dispatch: dispatchOperation };
}
