export type TeachingProject = {
  id: string
  name: string
  description: string | null
}

export type SessionDraft = {
  project_id: string
  title: string
  topic: string
  learning_goals: string
  lesson_structure: string
  content_outline: string
}