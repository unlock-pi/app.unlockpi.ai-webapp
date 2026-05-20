export type CourseDifficulty = "Beginner" | "Intermediate" | "Advanced";

export type ArrayCellTone = "default" | "active" | "muted" | "success" | "warning";

export interface ArrayVisualizationState {
  label: string;
  cells: Array<{
    id: string;
    value: string;
    tone?: ArrayCellTone;
  }>;
  activeIndex?: number;
  note: string;
}

export interface CourseCheckpointOption {
  id: string;
  label: string;
  rationale?: string;
}

export interface CourseCheckpoint {
  prompt: string;
  options: CourseCheckpointOption[];
  correctOptionId: string;
  explanation: string;
}

export interface CourseStep {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  conceptPoints: string[];
  coachPrompt: string;
  visualization?: ArrayVisualizationState;
  checkpoint?: CourseCheckpoint;
}

export interface CourseDefinition {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  difficulty: CourseDifficulty;
  estimatedMinutes: number;
  heroMetric: string;
  learningOutcomes: string[];
  steps: CourseStep[];
}
