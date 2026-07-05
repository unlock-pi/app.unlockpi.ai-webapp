import { notFound, redirect } from "next/navigation";

import { ProjectCanvasLibraryScreen } from "@/features/canvas/components/project-canvas-library-screen";
import { loadProjectCanvasLibraryPage } from "@/features/canvas/lib/canvas-page-loaders";
import { createClient } from "@/lib/server";

type PageProps = {
  params: Promise<{ project_id: string }>;
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const [{ project_id }, supabase] = await Promise.all([params, createClient()]);
  const result = await loadProjectCanvasLibraryPage(supabase, project_id);

  if (result.status === "redirect") {
    redirect(result.href);
  }

  if (result.status === "notFound") {
    notFound();
  }

  return <ProjectCanvasLibraryScreen model={result.model} />;
}
