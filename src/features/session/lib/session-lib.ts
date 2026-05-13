import { SessionDraft } from "../types/session-types"

export const emptySessionDraft: SessionDraft = {
  project_id: "",
  title: "",
  topic: "",
  learning_goals: "",
  lesson_structure: "",
  content_outline: "",
}

export const templateDefaults: Record<string, Partial<SessionDraft>> = {
  revision: {
    topic: "Revision Sprint",
    title: "Exam Revision Session",
    learning_goals: "Consolidate key concepts, identify weak spots, and complete focused practice.",
    lesson_structure: "Quick recap -> Targeted examples -> Timed practice -> Error review",
  },
  diagnostic: {
    topic: "Diagnostic Check",
    title: "Baseline Diagnostic Session",
    learning_goals: "Identify misconceptions, map skill gaps, and prioritize next teaching actions.",
    lesson_structure: "Warm-up questions -> Diagnostic tasks -> Discussion -> Next-step plan",
  },
  masterclass: {
    topic: "Concept Masterclass",
    title: "Deep Concept Class",
    learning_goals: "Build conceptual clarity and transfer learning to new problems.",
    lesson_structure: "Core concept -> Visual explanation -> Guided examples -> Exit challenge",
  },
  discussion: {
    topic: "Discussion Session",
    title: "Reasoning and Discussion Class",
    learning_goals: "Improve articulation, argument quality, and collaborative reasoning.",
    lesson_structure: "Prompt -> Small-group reasoning -> Class synthesis -> Reflection",
  },
}