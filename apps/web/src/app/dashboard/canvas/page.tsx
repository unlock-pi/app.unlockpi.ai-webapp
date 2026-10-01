import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CanvasLibraryScreen } from "@/features/canvas/components/canvas-library-screen";
import { loadCanvasLibraryPage } from "@/features/canvas/lib/canvas-page-loaders";
import { createClient } from "@/lib/server";
import { getSafeRedirectTarget } from "@/lib/safe-redirect";

export default async function CanvasLibraryPage() {
  const supabase = await createClient();
  const result = await loadCanvasLibraryPage(supabase);

  if (result.status === "redirect") {
    redirect(result.href);
  }

  if (result.status !== "ready") {
    const requestedPath = (await headers()).get("x-pathname");
    redirect(
      `/auth/login?redirectTo=${encodeURIComponent(
        getSafeRedirectTarget(requestedPath, "/dashboard/canvas"),
      )}`,
    );
  }

  return <CanvasLibraryScreen model={result.model} />;
}
