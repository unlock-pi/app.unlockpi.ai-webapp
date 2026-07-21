"use client";

import { useCallback, useRef, useState } from "react";

import type { MermaidDiagramType } from "@/features/visuals/lib/mermaid-config";
import type {
  AspectRatioKey,
  ImageModelTier,
  VisualStyleId,
} from "@/features/visuals/lib/visual-config";

export type VisualMode = "image" | "mermaid";

export type GeneratedVisual = {
  id?: string;
  kind: VisualMode | "pending";
  title?: string;
  prompt?: string;
  image_url?: string;
  mermaid_code?: string;
  cost_usd?: number | null;
  /** Only set on pending placeholders — when the request started. */
  createdAt?: number;
};

type ImageRequest = {
  description: string;
  style: VisualStyleId;
  aspectRatio: AspectRatioKey;
  tier: ImageModelTier;
  count: number;
};

type MermaidRequest = {
  description: string;
  diagramType: MermaidDiagramType;
};

let batchCounter = 0;

export function useVisualGeneration(initialVisuals: GeneratedVisual[] = []) {
  const [results, setResults] = useState<GeneratedVisual[]>(initialVisuals);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards the repair loop so a stubbornly broken diagram can't loop forever.
  const repairAttempts = useRef(0);
  const lastMermaidRequest = useRef<MermaidRequest | null>(null);

  const generateImages = useCallback(async (request: ImageRequest) => {
    setIsGenerating(true);
    setError(null);

    const batchId = `pending-${batchCounter++}`;
    const createdAt = Date.now();
    const placeholders: GeneratedVisual[] = Array.from(
      { length: request.count },
      (_, index) => ({ id: `${batchId}-${index}`, kind: "pending", createdAt }),
    );
    setResults((previous) => [...placeholders, ...previous]);

    try {
      const response = await fetch("/api/visuals/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Generation failed.");
      }
      const generated: GeneratedVisual[] = data.visuals ?? [];
      setResults((previous) => {
        const withoutPlaceholders = previous.filter(
          (visual) => !visual.id?.startsWith(batchId),
        );
        return [...generated, ...withoutPlaceholders];
      });
    } catch (unknownError) {
      setResults((previous) =>
        previous.filter((visual) => !visual.id?.startsWith(batchId)),
      );
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "Generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateMermaid = useCallback(async (request: MermaidRequest) => {
    setIsGenerating(true);
    setError(null);
    repairAttempts.current = 0;
    lastMermaidRequest.current = request;

    const batchId = `pending-${batchCounter++}`;
    const createdAt = Date.now();
    setResults((previous) => [
      { id: batchId, kind: "pending", createdAt },
      ...previous,
    ]);

    try {
      const response = await fetch("/api/visuals/generate-mermaid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Generation failed.");
      }
      setResults((previous) =>
        previous.map((visual) => (visual.id === batchId ? data.visual : visual)),
      );
    } catch (unknownError) {
      setResults((previous) => previous.filter((visual) => visual.id !== batchId));
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "Generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Called by MermaidPreview when the renderer rejects the code. We send the
   * parser error back to the model once and swap in the repaired version.
   */
  const repairMermaid = useCallback(
    async (brokenCode: string, parserError: string) => {
      const request = lastMermaidRequest.current;
      if (!request || repairAttempts.current >= 1) {
        setError("This diagram couldn't be rendered. Try rewording your request.");
        return;
      }
      repairAttempts.current += 1;

      try {
        const response = await fetch("/api/visuals/generate-mermaid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...request,
            previousCode: brokenCode,
            repairError: parserError,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.visual?.mermaid_code) {
          throw new Error("Repair failed.");
        }
        setResults((previous) =>
          previous.map((visual) =>
            visual.mermaid_code === brokenCode ? data.visual : visual,
          ),
        );
      } catch {
        setError("This diagram couldn't be rendered. Try rewording your request.");
      }
    },
    [],
  );

  return {
    results,
    isGenerating,
    error,
    generateImages,
    generateMermaid,
    repairMermaid,
    setResults,
  };
}
