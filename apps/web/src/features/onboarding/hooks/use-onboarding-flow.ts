"use client";

import { useCallback, useMemo, useState } from "react";

import {
  findOnboardingOption,
  onboardingSteps,
} from "@/features/onboarding/lib/onboarding-steps";

/**
 * Pure step-state for the onboarding flow — no realtime/voice knowledge at
 * all. `selectOption` is the single place an answer gets recorded and the
 * flow advances, so it doesn't matter whether it was called from a mouse
 * click or from the voice agent's tool call; both go through here.
 */
export function useOnboardingFlow() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentStep = onboardingSteps[stepIndex] ?? null;
  const isComplete = stepIndex >= onboardingSteps.length;

  const selectOption = useCallback(
    (optionId: string): boolean => {
      const step = onboardingSteps[stepIndex];
      if (!step) {
        return false;
      }
      const option = findOnboardingOption(step, optionId);
      if (!option) {
        return false;
      }
      setAnswers((previous) => ({ ...previous, [step.id]: option.id }));
      setStepIndex((index) => index + 1);
      return true;
    },
    [stepIndex],
  );

  return useMemo(
    () => ({
      answers,
      currentStep,
      isComplete,
      selectOption,
      stepIndex,
      totalSteps: onboardingSteps.length,
    }),
    [answers, currentStep, isComplete, selectOption, stepIndex],
  );
}
