import { notFound } from "next/navigation";

import { CanvasShareView } from "@/features/canvas/components/canvas-share-view";
import { mapCanvasRecord } from "@/features/canvas/lib/canvas-records";
import { createClient } from "@/lib/server";

export default async function SharedCanvasPage({
  params,
}: {
  params: Promise<{ shareSlug: string }>;
}) {
  const { shareSlug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("teaching_canvases")
    .select(
      "id, title, subject, template_key, updated_at, status, share_slug, is_public, topic, document, active_frame_id"
    )
    .eq("share_slug", shareSlug)
    .eq("is_public", true)
    .single();

  if (!data) {
    notFound();
  }

  return <CanvasShareView canvas={mapCanvasRecord(data)} />;
}
