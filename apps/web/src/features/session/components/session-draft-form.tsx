import { FormEvent } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { TeachingProject, SessionDraft } from "@/features/session/types/session-types"

type SessionDraftFormProps = {
  draft: SessionDraft
  projects: TeachingProject[]
  isSaving: boolean
  submitLabel: string
  errorMessage?: string | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onDraftChange: (draft: SessionDraft) => void
  cancelHref?: string
  onCancel?: () => void
  showProjectSelect?: boolean
}

export function SessionDraftForm({
  draft,
  projects,
  isSaving,
  submitLabel,
  errorMessage,
  onSubmit,
  onDraftChange,
  cancelHref,
  onCancel,
  showProjectSelect = true,
}: SessionDraftFormProps) {
  const projectOptions = projects.map((project) => ({
    label: project.name,
    value: project.id,
  }))

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {showProjectSelect ? (
        <div className="grid gap-2">
          <Label htmlFor="session-project">Project</Label>
          <Select
            value={draft.project_id}
            onValueChange={(value) =>
              onDraftChange({
                ...draft,
                project_id: value ?? "",
              })
            }
            items={projectOptions}
          >
            <SelectTrigger id="session-project" className="w-full border border-border bg-background">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {projectOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="session-topic">Topic name</Label>
        <Input
          id="session-topic"
          value={draft.topic}
          onChange={(event) =>
            onDraftChange({
              ...draft,
              topic: event.target.value,
            })
          }
          className="border border-border bg-background"
          placeholder="Linear equations in one variable"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="session-title">Session title</Label>
        <Input
          id="session-title"
          value={draft.title}
          onChange={(event) =>
            onDraftChange({
              ...draft,
              title: event.target.value,
            })
          }
          className="border border-border bg-background"
          placeholder="Sunday Revision: Solving Equations"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="session-goals">Learning goals</Label>
        <Textarea
          id="session-goals"
          value={draft.learning_goals}
          onChange={(event) =>
            onDraftChange({
              ...draft,
              learning_goals: event.target.value,
            })
          }
          className="min-h-24 border border-border bg-background"
          placeholder="Students should solve equations, explain balancing steps, and check solutions."
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="session-structure">Lesson structure</Label>
        <Textarea
          id="session-structure"
          value={draft.lesson_structure}
          onChange={(event) =>
            onDraftChange({
              ...draft,
              lesson_structure: event.target.value,
            })
          }
          className="min-h-24 border border-border bg-background"
          placeholder="Warmup (5m) -> Concept demo (15m) -> Guided practice (20m) -> Exit ticket (5m)."
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="session-outline">Content outline (optional)</Label>
        <Textarea
          id="session-outline"
          value={draft.content_outline}
          onChange={(event) =>
            onDraftChange({
              ...draft,
              content_outline: event.target.value,
            })
          }
          className="min-h-24 border border-border bg-background"
          placeholder="Key examples, misconceptions, discussion prompts, and checks for understanding."
        />
      </div>

      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}

      <div className="flex justify-end gap-2">
        {cancelHref ? (
          <Button type="button" variant="outline" render={<Link href={cancelHref} />}>
            Cancel
          </Button>
        ) : null}
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}
