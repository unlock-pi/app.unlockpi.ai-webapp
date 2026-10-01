"use client";

import { useEffect, useRef, useState } from "react";

import type { AutomatonExecution } from "@/packages/blocks/automata/model";
import {
  TRANSITION_FLOW_DURATION_MS,
} from "@/packages/blocks/automata/transition-diagram";

const TRANSITION_SETTLE_DELAY_MS = 140;

// Puck can remount a block when transient agent state changes. Keep the
// completed-step cursor outside the component so a remount continues from the
// last reached state instead of replaying the trace from step zero.
const playbackCursorByExecution = new Map<string, number>();
const transitionStartedAtByExecution = new Map<
  string,
  { stepCount: number; startedAt: number }
>();

/** A separate lifecycle-driven teaching timeline has already played this trace. */
export function completeExecutionPlayback(execution: AutomatonExecution) {
  playbackCursorByExecution.set(execution.executionId, execution.steps.length);
  transitionStartedAtByExecution.delete(execution.executionId);
}

function playbackCursor(execution: AutomatonExecution) {
  return Math.min(
    playbackCursorByExecution.get(execution.executionId) ?? 0,
    execution.steps.length,
  );
}

function activeTransitionStart(executionId: string, stepCount: number) {
  const active = transitionStartedAtByExecution.get(executionId);
  return active?.stepCount === stepCount ? active.startedAt : null;
}

function flowProgressAt(startedAt: number | null, durationMs: number) {
  if (startedAt === null) return 0;
  return Math.min(
    1,
    Math.max(0, (Date.now() - startedAt) / durationMs),
  );
}

export function executionBeforeStep(
  execution: AutomatonExecution,
  stepCount: number,
): AutomatonExecution {
  const steps = execution.steps.slice(0, stepCount);
  const step = steps.at(-1);
  if (!step) return execution;
  const completedSteps = steps.slice(0, -1);

  return {
    ...execution,
    status: "running",
    result: "unknown",
    inputIndex: step.inputIndex,
    currentStates: step.fromStates,
    activeTransitions: step.transitions,
    transitionPhase: "traveling",
    visitedStates: [
      ...new Set(
        completedSteps.flatMap((item) => [
          ...item.fromStates,
          ...item.toStates,
        ]),
      ),
      ...step.fromStates,
    ],
    visitedTransitions: [
      ...new Set(completedSteps.flatMap((item) => item.transitions)),
    ],
    stepIndex: step.stepIndex,
    steps,
  };
}

export function executionAtStep(
  execution: AutomatonExecution,
  stepCount: number,
): AutomatonExecution {
  const steps = execution.steps.slice(0, stepCount);
  const step = steps.at(-1);
  if (!step) return execution;

  return {
    ...execution,
    status: step.status,
    result: step.result,
    inputIndex: step.symbol === null ? step.inputIndex : step.inputIndex + 1,
    currentStates: step.toStates,
    activeTransitions: step.transitions,
    transitionPhase: undefined,
    visitedStates: [
      ...new Set(
        steps.flatMap((item) => [...item.fromStates, ...item.toStates]),
      ),
    ],
    visitedTransitions: [...new Set(steps.flatMap((item) => item.transitions))],
    stepIndex: step.stepIndex,
    steps,
  };
}

/**
 * Agent tools may evaluate a whole input string in one state update. Replay its
 * recorded steps locally so every state-to-state transition remains visible.
 */
export function useExecutionPlayback(
  execution: AutomatonExecution,
  durationMs = TRANSITION_FLOW_DURATION_MS,
) {
  const initialCursor = playbackCursor(execution);
  const [displayedExecution, setDisplayedExecution] = useState(() =>
    execution.steps[initialCursor]
      ? executionBeforeStep(execution, initialCursor + 1)
      : execution,
  );
  const [isTransitioning, setIsTransitioning] = useState(() =>
    Boolean(execution.steps[initialCursor]?.transitions.length),
  );
  const [flowProgress, setFlowProgress] = useState(() =>
    flowProgressAt(
      activeTransitionStart(execution.executionId, initialCursor + 1),
      durationMs,
    ),
  );
  const latestExecutionRef = useRef(execution);
  const playbackRef = useRef({
    executionId: execution.executionId,
    nextStep: initialCursor,
    timeout: null as ReturnType<typeof setTimeout> | null,
  });
  const advanceRef = useRef<() => void>(() => {});

  // Agent updates can append steps while the signal is moving. Keep the current
  // timer alive and read the newest trace only when this step actually arrives.
  useEffect(() => {
    latestExecutionRef.current = execution;
    advanceRef.current = () => {
      const playback = playbackRef.current;
      if (playback.timeout) return;
      const latest = latestExecutionRef.current;
      if (latest.executionId !== playback.executionId) return;
      const step = latest.steps[playback.nextStep];
      if (!step) {
        setIsTransitioning(false);
        setFlowProgress(0);
        setDisplayedExecution(latest);
        return;
      }

      const stepCount = playback.nextStep + 1;
      if (!step.transitions.length) {
        setIsTransitioning(false);
        setDisplayedExecution(executionAtStep(latest, stepCount));
        playback.nextStep = stepCount;
        playbackCursorByExecution.set(playback.executionId, stepCount);
        transitionStartedAtByExecution.delete(playback.executionId);
        setFlowProgress(1);
        playback.timeout = setTimeout(() => {
          playback.timeout = null;
          advanceRef.current();
        }, TRANSITION_SETTLE_DELAY_MS);
        return;
      }

      const existingStart = activeTransitionStart(
        playback.executionId,
        stepCount,
      );
      const startedAt = existingStart ?? Date.now();
      if (!existingStart) {
        transitionStartedAtByExecution.set(playback.executionId, {
          stepCount,
          startedAt,
        });
      }
      setIsTransitioning(true);
      setFlowProgress(flowProgressAt(startedAt, durationMs));
      setDisplayedExecution(executionBeforeStep(latest, stepCount));
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
        ? 0
        : Math.max(0, durationMs - (Date.now() - startedAt));
      playback.timeout = setTimeout(() => {
        const current = latestExecutionRef.current;
        if (current.executionId !== playback.executionId) return;
        setDisplayedExecution(executionAtStep(current, stepCount));
        playback.nextStep = stepCount;
        playbackCursorByExecution.set(playback.executionId, stepCount);
        transitionStartedAtByExecution.delete(playback.executionId);
        setFlowProgress(0);
        playback.timeout = setTimeout(() => {
          playback.timeout = null;
          setIsTransitioning(false);
          advanceRef.current();
        }, TRANSITION_SETTLE_DELAY_MS);
      }, duration);
    };

    const playback = playbackRef.current;
    if (
      playback.executionId !== execution.executionId ||
      execution.steps.length < playback.nextStep
    ) {
      if (playback.timeout) clearTimeout(playback.timeout);
      playback.timeout = null;
      transitionStartedAtByExecution.delete(playback.executionId);
      playback.executionId = execution.executionId;
      playback.nextStep = playbackCursor(execution);
    }
    if (!playback.timeout) {
      playback.timeout = setTimeout(() => {
        playback.timeout = null;
        advanceRef.current();
      }, 0);
    }
  }, [execution, durationMs]);

  useEffect(
    () => () => {
      const playback = playbackRef.current;
      if (playback.timeout) clearTimeout(playback.timeout);
      playback.timeout = null;
    },
    [],
  );

  // Render the new execution at its source immediately; the effect will start
  // its timer next. This avoids a frame showing states from the old graph.
  const currentExecution =
    displayedExecution.executionId === execution.executionId;
  return {
    displayedExecution: currentExecution
      ? displayedExecution
      : execution.steps[initialCursor]
        ? executionBeforeStep(execution, initialCursor + 1)
        : execution,
    flowProgress: currentExecution
      ? flowProgress
      : flowProgressAt(
          activeTransitionStart(execution.executionId, initialCursor + 1),
          durationMs,
        ),
    isTransitioning: currentExecution
      ? isTransitioning
      : Boolean(execution.steps[initialCursor]?.transitions.length),
  };
}
