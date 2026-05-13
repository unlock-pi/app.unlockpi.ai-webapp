"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useEffect, useMemo, useRef, useState } from "react"

import { ArrowLeftIcon } from "lucide-react"

import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import { SessionDraft } from "@/features/session/types/session-types"
import { TeachingProject } from "@/features/project/types/project-types"
import { emptySessionDraft, templateDefaults } from "@/features/session/lib/session-lib"




export default function NewSessionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [projects, setProjects] = useState<TeachingProject[]>([])
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sessionDraft, setSessionDraft] = useState<SessionDraft>(emptySessionDraft)

  const initialProjectId = searchParams.get("project_id") ?? ""
  const requestedTemplate = searchParams.get("template") ?? ""
  const templateSeededRef = useRef(false)

  const projectOptions = useMemo(
    () => projects.map((project) => ({ label: project.name, value: project.id })),
    [projects]
  )

  useEffect(() => {
    const selectedTemplate = templateDefaults[requestedTemplate]

    if (!selectedTemplate || templateSeededRef.current) {
      return
    }

    setSessionDraft((previous) => ({
      ...previous,
      ...selectedTemplate,
      project_id: previous.project_id || initialProjectId,
    }))
    templateSeededRef.current = true
  }, [initialProjectId, requestedTemplate])

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoadingProjects(true)
      setErrorMessage(null)

      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        router.replace("/auth/login")
        return
      }

      setOwnerId(user.id)

      const { data, error } = await supabase
        .from("teaching_projects")
        .select("id, name, description")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })

      if (error) {
        setErrorMessage(error.message)
        setProjects([])
        setIsLoadingProjects(false)
        return
      }

      const fetchedProjects = (data ?? []) as TeachingProject[]
      setProjects(fetchedProjects)
      setSessionDraft((previous) => ({
        ...previous,
        project_id:
          previous.project_id ||
          initialProjectId ||
          fetchedProjects[0]?.id ||
          "",
      }))
      setIsLoadingProjects(false)
    }

    void loadProjects()
  }, [initialProjectId, router])

  const handleCreateSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!ownerId) {
      setErrorMessage("Please sign in again before creating a session.")
      return
    }

    const requiredFields: Array<[string, string]> = [
      ["project", sessionDraft.project_id],
      ["topic", sessionDraft.topic.trim()],
      ["title", sessionDraft.title.trim()],
      ["learning goals", sessionDraft.learning_goals.trim()],
      ["lesson structure", sessionDraft.lesson_structure.trim()],
    ]

    const missingField = requiredFields.find(([, value]) => !value)
    if (missingField) {
      setErrorMessage(`Please provide ${missingField[0]} before creating a session.`)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    const supabase = createClient()
    const { data, error } = await supabase
      .from("teaching_sessions")
      .insert({
        owner_id: ownerId,
        project_id: sessionDraft.project_id,
        topic: sessionDraft.topic.trim(),
        title: sessionDraft.title.trim(),
        learning_goals: sessionDraft.learning_goals.trim(),
        lesson_structure: sessionDraft.lesson_structure.trim(),
        content_outline: sessionDraft.content_outline.trim() || null,
        status: "draft",
        is_live: false,
      })
      .select("id")
      .single()

    if (error || !data?.id) {
      setErrorMessage(error?.message ?? "Unable to create session.")
      setIsSaving(false)
      return
    }

    router.push(`/dashboard/project/${sessionDraft.project_id}?session=${data.id}`)
  }

  const backHref = sessionDraft.project_id
    ? `/dashboard/project/${sessionDraft.project_id}`
    : "/dashboard"

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-4 md:px-6 md:py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={backHref} />}
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader className="border-b">
          <div className="h-40 relative rounded-t-2xl  overflow-hidden">
            <Image className="absolute  -top-10" src={"/teacher-students-banner.png"} alt="Teacher Empowering" width={900} height={205} />
            {/* <Image src={"/teacher-empowering.png"} alt="Teacher Empowering" width={200} height={225} /> */}
            <CardTitle className="text-black absolute top-6 left-4 text-2xl">New Session</CardTitle>
            <CardDescription className="text-black/60 absolute top-14 max-w-sm left-4 ">
              Fill these prompts to create a structured session inside your selected project.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {isLoadingProjects ? (
            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>

              <div className="grid gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>

              <div className="grid gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>

              <div className="grid gap-2">
                <Skeleton className="h-4 w-26" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>

              <div className="grid gap-2">
                <Skeleton className="h-4 w-30" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>

              <div className="grid gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-32 rounded-lg" />
              </div>
            </div>
          ) : null}

          {!isLoadingProjects && projects.length === 0 ? (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                You need at least one project before creating a session.
              </p>
              <Button
                variant="default"
                render={<Link href="/dashboard/session/new?quickAction=new-project" />}
              >
                Create project first
              </Button>
            </div>
          ) : null}

          {!isLoadingProjects && projects.length > 0 ? (
            <form onSubmit={handleCreateSession} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="session-project">Project</Label>
                <Select
                  value={sessionDraft.project_id}
                  onValueChange={(value) =>
                    setSessionDraft((previous) => ({
                      ...previous,
                      project_id: value ?? "",
                    }))
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

              <div className="grid gap-2">
                <Label htmlFor="session-topic">Topic name</Label>
                <Input
                  id="session-topic"
                  value={sessionDraft.topic}
                  onChange={(event) =>
                    setSessionDraft((previous) => ({
                      ...previous,
                      topic: event.target.value,
                    }))
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
                  value={sessionDraft.title}
                  onChange={(event) =>
                    setSessionDraft((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
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
                  value={sessionDraft.learning_goals}
                  onChange={(event) =>
                    setSessionDraft((previous) => ({
                      ...previous,
                      learning_goals: event.target.value,
                    }))
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
                  value={sessionDraft.lesson_structure}
                  onChange={(event) =>
                    setSessionDraft((previous) => ({
                      ...previous,
                      lesson_structure: event.target.value,
                    }))
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
                  value={sessionDraft.content_outline}
                  onChange={(event) =>
                    setSessionDraft((previous) => ({
                      ...previous,
                      content_outline: event.target.value,
                    }))
                  }
                  className="min-h-24 border border-border bg-background"
                  placeholder="Key examples, misconceptions, discussion prompts, and checks for understanding."
                />
              </div>

              {errorMessage ? (
                <p className="text-xs text-destructive">{errorMessage}</p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  render={<Link href={backHref} />}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Creating..." : "Create session"}
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}
