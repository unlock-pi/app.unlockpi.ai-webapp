import { openai } from "@ai-sdk/openai";
import { generateImage } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";

import {
  ASPECT_RATIOS,
  ESTIMATED_IMAGE_COST_USD,
  IMAGE_MODELS,
  buildImagePrompt,
  type AspectRatioKey,
  type ImageModelTier,
  type VisualStyleId,
} from "@/features/visuals/lib/visual-config";
import { createClient } from "@/lib/server";

export const runtime = "nodejs";
// Image generation is slow; give it room before the platform kills the request.
export const maxDuration = 300;

type RequestBody = {
  description?: string;
  style?: VisualStyleId;
  aspectRatio?: AspectRatioKey;
  tier?: ImageModelTier;
  count?: number;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY on the server." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const description = body.description?.trim();
  if (!description) {
    return NextResponse.json(
      { error: "Describe what you want to create." },
      { status: 400 },
    );
  }

  const tier = body.tier && body.tier in IMAGE_MODELS ? body.tier : "standard";
  const ratioKey =
    body.aspectRatio && body.aspectRatio in ASPECT_RATIOS
      ? body.aspectRatio
      : "1:1";
  const style = (body.style ?? "technical-diagram") as VisualStyleId;
  const count = Math.min(Math.max(body.count ?? 1, 1), 4);

  const tierConfig = IMAGE_MODELS[tier];
  const ratio = ASPECT_RATIOS[ratioKey];

  let images: { base64: string }[];
  try {
    const result = await generateImage({
      model: openai.image(tierConfig.model),
      prompt: buildImagePrompt(description, style),
      n: count,
      size: ratio.size,
      providerOptions: { openai: { quality: tierConfig.quality } },
    });
    images = result.images;
  } catch (error) {
    console.error("[visuals/image] generation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Image generation failed. Please try again.",
      },
      { status: 502 },
    );
  }

  // Push the raw bytes to UploadThing so we store a URL, not megabytes of
  // base64, in Postgres.
  const utapi = new UTApi();
  const files = images.map((image, index) => {
    const bytes = Buffer.from(image.base64, "base64");
    return new File([new Uint8Array(bytes)], `visual-${Date.now()}-${index}.png`, {
      type: "image/png",
    });
  });

  const uploads = await utapi.uploadFiles(files);
  const urls = uploads
    .map((upload) => upload.data?.ufsUrl)
    .filter((url): url is string => Boolean(url));

  if (urls.length === 0) {
    return NextResponse.json(
      { error: "Images were generated but could not be saved." },
      { status: 502 },
    );
  }

  // Rough per-image estimate for the admin spend panel — see the comment on
  // ESTIMATED_IMAGE_COST_USD before treating this as billing-accurate.
  const costPerImage = ESTIMATED_IMAGE_COST_USD[tier];

  const { data: saved, error: saveError } = await supabase
    .from("visuals")
    .insert(
      urls.map((url) => ({
        owner_id: user.id,
        kind: "image" as const,
        title: description.slice(0, 120),
        prompt: description,
        style,
        aspect_ratio: ratioKey,
        model_tier: tier,
        image_url: url,
        cost_usd: costPerImage,
      })),
    )
    .select();

  if (saveError) {
    // The images exist and are usable — don't fail the request over history.
    console.error("[visuals/image] could not persist:", saveError);
    return NextResponse.json({
      visuals: urls.map((url) => ({
        image_url: url,
        kind: "image",
        prompt: description,
        title: description.slice(0, 120),
      })),
      warning: "Generated, but could not be saved to your library.",
    });
  }

  return NextResponse.json({ visuals: saved });
}
