import { redirect } from "next/navigation";

import { VisualsScreen } from "@/features/visuals/components/visuals-screen";
import type { GeneratedVisual } from "@/features/visuals/hooks/use-visual-generation";
import { createClient } from "@/lib/server";

// Always show the freshest library rather than a cached snapshot.
export const dynamic = "force-dynamic";

export default async function VisualsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // This is what makes generated visuals survive a refresh.
  const { data } = await supabase
    .from("visuals")
    .select("id, kind, title, prompt, image_url, mermaid_code, cost_usd")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);

  return <VisualsScreen initialVisuals={(data ?? []) as GeneratedVisual[]} />;
}
