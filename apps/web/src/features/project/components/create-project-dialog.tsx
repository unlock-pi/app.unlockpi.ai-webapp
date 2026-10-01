"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { PlusIcon } from "lucide-react"
import { useNextStep } from "nextstepjs"

import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ONBOARDING_TOUR_NAME, OnboardingStep } from "@/features/onboarding/lib/onboarding-tour"

export function CreateProjectDialog() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [projectDescription, setProjectDescription] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const { currentTour, currentStep, setCurrentStep } = useNextStep()

  useEffect(() => {
    // Opening this dialog is the real action that advances the onboarding
    // tour from "click New project" to "fill in the name" — not a click on
    // the tour card itself. See onboarding-tour.ts.
    if (
      isOpen &&
      currentTour === ONBOARDING_TOUR_NAME &&
      currentStep === OnboardingStep.ClickNewProject
    ) {
      setCurrentStep(OnboardingStep.FillProjectDialog, 150)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentTour])

  const resetForm = () => {
    setProjectName("")
    setProjectDescription("")
    setErrorMessage(null)
    setIsSaving(false)
  }

  const handleCreateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = projectName.trim()
    if (!trimmedName) {
      setErrorMessage("Project name is required.")
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      setErrorMessage("Please sign in again before creating a project.")
      setIsSaving(false)
      return
    }

    const { data, error } = await supabase
      .from("teaching_projects")
      .insert({
        owner_id: user.id,
        name: trimmedName,
        description: projectDescription.trim() || null,
      })
      .select("id")
      .single()

    if (error || !data?.id) {
      setErrorMessage(error?.message ?? "Unable to create project.")
      setIsSaving(false)
      return
    }

    resetForm()
    setIsOpen(false)
    router.push(`/dashboard/project/${data.id}`)
    router.refresh()
  }

  return (
    <>
      <Button
        id="onboarding-new-project"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <PlusIcon className="size-4" />
        New project
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) {
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateProject} className="flex h-full flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
              <DialogDescription>
                Group related teaching sessions under one workspace.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 px-6">
              <div id="onboarding-project-name" className="grid gap-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Grade 8 - Algebra Foundations"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  className="min-h-24"
                  placeholder="Scope, pacing, and classroom objectives for this project."
                />
              </div>

              {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Creating..." : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
