import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { FilesIcon, FileTextIcon, FolderIcon, PenLineIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CreateProjectDialog } from "@/features/project/components/create-project-dialog";
import { ProjectsGrid } from "@/features/project/components/projects-grid";
import type { TeachingCanvasPreview } from "@/features/project/lib/canvas-preview";
import type { TeachingProject } from "@/features/project/types/project-types";
import { createClient } from "@/lib/server";
import { getSafeRedirectTarget } from "@/lib/safe-redirect";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const requestedPath = (await headers()).get("x-pathname");
    redirect(
      `/auth/login?redirectTo=${encodeURIComponent(
        getSafeRedirectTarget(requestedPath, "/dashboard/projects"),
      )}`,
    );
  }

  const [projectsRes, canvasesRes] = await Promise.all([
    supabase
      .from("teaching_projects")
      .select("id, owner_id, name, description, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
    // NOTE: this pulls each canvas's full `document` JSON just to sketch a
    // first-frame preview on the projects page. Fine for a prototype grid;
    // if this ships, swap it for a lighter query (e.g. a stored thumbnail or
    // a DB view that only returns the first frame) instead of the whole doc.
    supabase
      .from("teaching_canvases")
      .select("id, project_id, title, updated_at, document")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  const projects = (projectsRes.data ?? []) as TeachingProject[];
  const canvases = (canvasesRes.data ?? []) as TeachingCanvasPreview[];

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-4 md:px-6 md:pb-6 md:pt-0">
      <div className="flex flex-col gap-4 rounded-lg   pb-6  md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl space-y-1">
          {/* <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Projects
          </p> */}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Your teaching workspace
            </h1>
            {/* <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Projects and sessions now live here instead of the sidebar. Open a project to review
              its sessions, edit them, and jump into talk mode from one place.
            </p> */}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CreateProjectDialog />
          {/* <Button
            variant="secondary"
            render={<Link href="/dashboard/session/new" />}
          >
            <PenLineIcon className="size-4" />
            New session
          </Button> */}
        </div>
      </div>

      {projects.length === 0 && canvases.length === 0 ? (
        <Empty className="md:mt-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderIcon />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create your first project to organize sessions by class, unit, or
              term.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ProjectsGrid projects={projects} canvases={canvases} />
      )}
    </section>
  );
}
