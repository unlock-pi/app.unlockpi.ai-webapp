import { notFound } from "next/navigation";

import { CanvasEditorScreen } from "@/features/canvas/components/canvas-editor-screen";
import { loadCanvasEditorPage } from "@/features/canvas/lib/canvas-page-loaders";
import { createClient } from "@/lib/server";

export default async function CanvasEditorPage({
  params,
}: {
  params: Promise<{ canvasId: string }>;
}) {
  const { canvasId } = await params;
  const supabase = await createClient();
  const result = await loadCanvasEditorPage(supabase, canvasId);

  if (result.status === "redirect") {
    notFound();
  }

  if (result.status === "notFound") {
    notFound();
  }

  return <CanvasEditorScreen model={result.model} />;
}
