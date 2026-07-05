import { NextRequest, NextResponse } from "next/server";

import type { CanvasDocument, CanvasTemplateKey } from "@/features/canvas/types/canvas-types";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/server";

type SaveCanvasRequest = {
  activeFrameId: string | null;
  document: CanvasDocument;
  templateKey: CanvasTemplateKey | null;
  title: string;
  topic: string | null;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in again to save this canvas." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SaveCanvasRequest | null;
  const title = body?.title?.trim();

  if (!body || !title || !body.document || typeof body.document !== "object") {
    return NextResponse.json({ error: "The canvas draft is incomplete." }, { status: 400 });
  }

  const { canvasId } = await params;
  const { data, error } = await supabase
    .from("teaching_canvases")
    .update({
      active_frame_id: body.activeFrameId,
      document: body.document,
      status: "draft",
      subject: "computer_science",
      template_key: body.templateKey,
      title,
      topic: body.topic?.trim() || title,
    })
    .eq("id", canvasId)
    .eq("owner_id", user.id)
    .select(
      "id, title, subject, template_key, updated_at, status, share_slug, is_public, topic, project_id",
    )
    .maybeSingle();

  if (error) {
    console.error("Canvas save failed", { canvasId, code: error.code, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    const admin = createAdminClient();
    const { data: existingCanvas } = await admin
      .from("teaching_canvases")
      .select("id, owner_id, is_public")
      .eq("id", canvasId)
      .maybeSingle();

    if (existingCanvas && existingCanvas.owner_id !== user.id) {
      return NextResponse.json(
        {
          error:
            "This canvas is read-only in this view. Open your own canvas to edit it.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "This canvas was not found or you no longer have access to it." },
      { status: 404 },
    );
  }

  return NextResponse.json({ canvas: data });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in again to share this canvas." }, { status: 401 });
  }

  const { canvasId } = await params;
  const { data, error } = await supabase
    .from("teaching_canvases")
    .update({ is_public: true })
    .eq("id", canvasId)
    .eq("owner_id", user.id)
    .select("share_slug, is_public")
    .maybeSingle();

  if (error) {
    console.error("Canvas sharing failed", { canvasId, code: error.code, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data?.share_slug) {
    const admin = createAdminClient();
    const { data: existingCanvas } = await admin
      .from("teaching_canvases")
      .select("id, owner_id")
      .eq("id", canvasId)
      .maybeSingle();

    if (existingCanvas && existingCanvas.owner_id !== user.id) {
      return NextResponse.json(
        {
          error:
            "Only the owner of this canvas can create or refresh its public link.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "This canvas was not found or does not have a share link." },
      { status: 404 },
    );
  }

  return NextResponse.json({ canvas: data });
}
