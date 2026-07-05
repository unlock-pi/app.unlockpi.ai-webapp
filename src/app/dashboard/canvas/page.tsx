import { redirect } from "next/navigation";

import { CanvasLibraryScreen } from "@/features/canvas/components/canvas-library-screen";
import { loadCanvasLibraryPage } from "@/features/canvas/lib/canvas-page-loaders";
import { createClient } from "@/lib/server";

export default async function CanvasLibraryPage() {
  const supabase = await createClient();
  const result = await loadCanvasLibraryPage(supabase);

  if (result.status === "redirect") {
    redirect(result.href);
  }

  if (result.status !== "ready") {
    redirect("/auth/login");
  }

  return <CanvasLibraryScreen model={result.model} />;
}
