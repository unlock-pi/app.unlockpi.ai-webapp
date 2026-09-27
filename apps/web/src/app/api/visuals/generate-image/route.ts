import { openai } from "@ai-sdk/openai";
import { generateImage } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";

import { estimateGenerationCost } from "@/features/visuals/lib/generation-pricing";
import {
  ASPECT_RATIOS,
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
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  try {
    const result = await generateImage({
      model: openai.image(tierConfig.model),
      prompt: buildImagePrompt(description, style),
      n: count,
      size: ratio.size,
      providerOptions: { openai: { quality: tierConfig.quality } },
    });
    images = result.images;
    // Combined usage for the whole call (may cover multiple images if n > 1) —
    // split evenly per image below when saving.
    inputTokens = result.usage?.inputTokens;
    outputTokens = result.usage?.outputTokens;
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

  // Split the call's combined token usage evenly across the images it
  // produced, and price each share — real tokens x rate, not a flat guess.
  // `estimateGenerationCost` returns null (never 0) when the model has no
  // rate card, so an unpriced model can't masquerade as a free generation.
  const perImageInputTokens = inputTokens
    ? Math.round(inputTokens / urls.length)
    : undefined;
  const perImageOutputTokens = outputTokens
    ? Math.round(outputTokens / urls.length)
    : undefined;
  const priced = estimateGenerationCost({
    model: tierConfig.model,
    inputTokens: perImageInputTokens,
    outputTokens: perImageOutputTokens,
  });

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
        cost_usd: priced?.costUsd ?? null,
        input_tokens: perImageInputTokens ?? null,
        output_tokens: perImageOutputTokens ?? null,
        pricing_version: priced?.version ?? null,
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
