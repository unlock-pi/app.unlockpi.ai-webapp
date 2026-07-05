import { createClient } from "@/lib/server";
import type {
  CanvasEditorPageModel,
  CanvasLibraryPageModel,
  CanvasProjectOption,
  ProjectCanvasLibraryPageModel,
} from "@/features/canvas/types/canvas-other-types";
import {
  mapCanvasRecord,
  mapCanvasSummary,
} from "@/features/canvas/lib/canvas-records";
import type { TeachingProject } from "@/features/project/types/project-types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type ReadyResult<T> = { status: "ready"; model: T };
type RedirectResult = { status: "redirect"; href: string };
type NotFoundResult = { status: "notFound" };

export type CanvasPageLoadResult<T> =
  | NotFoundResult
  | ReadyResult<T>
  | RedirectResult;

function mapProjectOptions(
  rows: Array<Pick<TeachingProject, "id" | "name">> | null,
): CanvasProjectOption[] {
  return (rows ?? []) as CanvasProjectOption[];
}

export async function loadCanvasLibraryPage(
  supabase: ServerClient,
): Promise<CanvasPageLoadResult<CanvasLibraryPageModel>> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: "redirect", href: "/auth/login" };
  }

  const [canvasRes, projectsRes] = await Promise.all([
    supabase
      .from("teaching_canvases")
      .select(
        "id, title, subject, template_key, updated_at, status, share_slug, is_public, topic, project_id",
      )
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("teaching_projects")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  return {
    status: "ready",
    model: {
      availableProjects: mapProjectOptions(projectsRes.data),
      canvases: (canvasRes.data ?? []).map(mapCanvasSummary),
      mode: "library",
    },
  };
}

export async function loadProjectCanvasLibraryPage(
  supabase: ServerClient,
  projectId: string,
): Promise<CanvasPageLoadResult<ProjectCanvasLibraryPageModel>> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: "redirect", href: "/auth/login" };
  }

  const [projectRes, canvasesRes, projectsRes] = await Promise.all([
    supabase
      .from("teaching_projects")
      .select("id, owner_id, name, description, created_at, updated_at")
      .eq("owner_id", user.id)
      .eq("id", projectId)
      .single(),
    supabase
      .from("teaching_canvases")
      .select(
        "id, title, subject, template_key, updated_at, status, share_slug, is_public, topic, project_id",
      )
      .eq("owner_id", user.id)
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("teaching_projects")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (projectRes.error || !projectRes.data || canvasesRes.error) {
    return { status: "notFound" };
  }

  return {
    status: "ready",
    model: {
      availableProjects: mapProjectOptions(projectsRes.data),
      canvases: (canvasesRes.data ?? []).map(mapCanvasSummary),
      mode: "project_library",
      project: {
        id: projectRes.data.id,
        name: projectRes.data.name,
      },
    },
  };
}

export async function loadCanvasEditorPage(
  supabase: ServerClient,
  canvasId: string,
): Promise<CanvasPageLoadResult<CanvasEditorPageModel>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "notFound" };
  }

  const [canvasRes, summariesRes, projectsRes] = await Promise.all([
    supabase
      .from("teaching_canvases")
      .select(
        "id, title, subject, template_key, updated_at, status, share_slug, is_public, topic, document, active_frame_id, project_id",
      )
      .eq("id", canvasId)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("teaching_canvases")
      .select(
        "id, title, subject, template_key, updated_at, status, share_slug, is_public, topic, project_id",
      )
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("teaching_projects")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (!canvasRes.data) {
    return { status: "notFound" };
  }

  return {
    status: "ready",
    model: {
      availableProjects: mapProjectOptions(projectsRes.data),
      canvas: mapCanvasRecord(canvasRes.data),
      mode: "editor",
      siblingCanvases: (summariesRes.data ?? []).map(mapCanvasSummary),
    },
  };
}
