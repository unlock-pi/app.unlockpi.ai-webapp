"use client";

import { useEffect, useState } from "react";

function initialHighlighted(
  highlightedIndex: number | undefined,
  traversalTarget: number | undefined,
) {
  // Once a traversal target is set, `highlightedIndex` becomes the
  // traversal cursor and must start unset — otherwise its authored
  // default (e.g. 0) would immediately render as an already-visited,
  // dimmed cell before Traverse/Step ever runs.
  return traversalTarget === undefined ? highlightedIndex : undefined;
}

function initialVisited(
  visitedIndices: number[] | undefined,
  traversalTarget: number | undefined,
) {
  return traversalTarget === undefined ? (visitedIndices ?? []) : [];
}

export function useTraversalState(
  highlightedIndex: number | undefined,
  visitedIndices: number[] | undefined,
  traversalTarget: number | undefined,
) {
  const [liveHighlightedIndex, setLiveHighlightedIndex] = useState(() =>
    initialHighlighted(highlightedIndex, traversalTarget),
  );
  const [liveVisitedIndices, setLiveVisitedIndices] = useState(() =>
    initialVisited(visitedIndices, traversalTarget),
  );

  useEffect(() => {
    setLiveHighlightedIndex(initialHighlighted(highlightedIndex, traversalTarget));
    setLiveVisitedIndices(initialVisited(visitedIndices, traversalTarget));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedIndex, traversalTarget]);

  function setTraversal(
    nextHighlighted: number | undefined,
    nextVisited: number[],
  ) {
    setLiveHighlightedIndex(nextHighlighted);
    setLiveVisitedIndices(nextVisited);
  }

  return {
    highlightedIndex: liveHighlightedIndex,
    visitedIndices: liveVisitedIndices,
    setTraversal,
  };
}
