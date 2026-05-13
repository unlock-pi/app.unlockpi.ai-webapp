export type TeachingProject = {
  id: string
  owner_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type TeachingSession = {
  id: string
  owner_id: string
  project_id: string
  title: string
  topic: string
  learning_goals: string
  lesson_structure: string
  content_outline: string | null
  status: string
  is_live: boolean
  created_at: string
  updated_at: string
}