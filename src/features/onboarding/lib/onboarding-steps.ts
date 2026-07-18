/**
 * The onboarding question flow. Plain data on purpose — both the UI and the
 * server-side realtime instructions (see the onboarding token route) read
 * from this single list, so the voice agent is never out of sync with what's
 * on screen.
 */

export type OnboardingOption = {
  id: string;
  label: string;
};

export type OnboardingStep = {
  id: string;
  question: string;
  options: OnboardingOption[];
};

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "role",
    question: "What best describes you?",
    options: [
      { id: "teacher", label: "Teacher" },
      { id: "tutor", label: "Independent tutor" },
      { id: "parent", label: "Parent" },
      { id: "student", label: "Student" },
    ],
  },
  {
    id: "subject",
    question: "Which subject do you want to start with?",
    options: [
      { id: "cs", label: "Computer science" },
      { id: "math", label: "Math" },
      { id: "science", label: "Science" },
      { id: "other", label: "Something else" },
    ],
  },
  {
    id: "class_size",
    question: "How do you usually teach?",
    options: [
      { id: "one_on_one", label: "One-on-one" },
      { id: "small_group", label: "Small group" },
      { id: "whole_class", label: "Whole class" },
    ],
  },
];

export function findOnboardingOption(
  step: OnboardingStep,
  optionId: string,
): OnboardingOption | undefined {
  return step.options.find((option) => option.id === optionId);
}
