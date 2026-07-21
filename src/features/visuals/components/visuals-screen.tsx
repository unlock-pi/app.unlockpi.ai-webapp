"use client";

import { useEffect, useState } from "react";
import {
  Code2Icon,
  DownloadIcon,
  ImageIcon,
  QuoteIcon,
  WorkflowIcon,
} from "lucide-react";
import Masonry from "react-masonry-css";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { AnimatedPlaceholder } from "@/features/visuals/components/animated-placeholder";
import { MermaidPreview } from "@/features/visuals/components/mermaid-preview";
import {
  AspectRatioPreview,
  CountPreview,
  OptionPopover,
} from "@/features/visuals/components/option-popover";
import { VisualsHero } from "@/features/visuals/components/visuals-hero";
import {
  useVisualGeneration,
  type GeneratedVisual,
  type VisualMode,
} from "@/features/visuals/hooks/use-visual-generation";
import {
  MERMAID_DIAGRAM_TYPES,
  type MermaidDiagramType,
} from "@/features/visuals/lib/mermaid-config";
import {
  ASPECT_RATIOS,
  IMAGE_COUNTS,
  IMAGE_MODELS,
  PLACEHOLDER_EXAMPLES,
  VISUAL_STYLES,
  VISUAL_SUGGESTIONS,
  type AspectRatioKey,
  type ImageModelTier,
  type VisualStyleId,
} from "@/features/visuals/lib/visual-config";

/** Pinterest-style columns. Keys are max-widths in px. */
const MASONRY_BREAKPOINTS = { default: 3, 1024: 2, 640: 1 };

type VisualsScreenProps = {
  initialVisuals?: GeneratedVisual[];
};

export function VisualsScreen({ initialVisuals = [] }: VisualsScreenProps) {
  const [mode, setMode] = useState<VisualMode>("image");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState<VisualStyleId>("auto");
  const [ratio, setRatio] = useState<AspectRatioKey>("1:1");
  const [tier, setTier] = useState<ImageModelTier>("standard");
  const [count, setCount] = useState(1);
  const [diagramType, setDiagramType] = useState<MermaidDiagramType>("auto");

  const {
    results,
    isGenerating,
    error,
    generateImages,
    generateMermaid,
    repairMermaid,
  } = useVisualGeneration(initialVisuals);

  const handleSubmit = () => {
    if (!description.trim() || isGenerating) return;
    if (mode === "image") {
      void generateImages({
        description,
        style,
        aspectRatio: ratio,
        tier,
        count,
      });
    } else {
      void generateMermaid({ description, diagramType });
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <VisualsHero />

      <PromptInput onSubmit={handleSubmit} className="">
        <PromptInputBody className="border-border/40 border">
          <div className="relative w-full">
            <AnimatedPlaceholder
              phrases={PLACEHOLDER_EXAMPLES[mode]}
              visible={description.length === 0}
            />
            <PromptInputTextarea
              className="w-full!"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder=""
            />
          </div>
        </PromptInputBody>

        <PromptInputFooter>
          <PromptInputTools>
            <OptionPopover
              value={mode}
              onChange={(value) => setMode(value as VisualMode)}
              triggerLabel={mode === "image" ? "Image" : "Diagram"}
              triggerIcon={mode === "image" ? ImageIcon : WorkflowIcon}
              columns={1}
              options={[
                { value: "image", label: "Image", icon: ImageIcon },
                { value: "mermaid", label: "Diagram", icon: WorkflowIcon },
              ]}
            />

            {mode === "image" ? (
              <>
                <OptionPopover
                  value={style}
                  onChange={(value) => setStyle(value as VisualStyleId)}
                  triggerLabel={
                    VISUAL_STYLES.find((entry) => entry.id === style)?.label ??
                    "Style"
                  }
                  triggerIcon={
                    VISUAL_STYLES.find((entry) => entry.id === style)?.icon
                  }
                  columns={2}
                  options={VISUAL_STYLES.map((entry) => ({
                    value: entry.id,
                    label: entry.label,
                    hint: entry.description,
                    icon: entry.icon,
                  }))}
                />
                <OptionPopover
                  value={ratio}
                  onChange={(value) => setRatio(value as AspectRatioKey)}
                  triggerLabel={ASPECT_RATIOS[ratio].hint}
                  columns={2}
                  options={(Object.keys(ASPECT_RATIOS) as AspectRatioKey[]).map(
                    (key) => ({
                      value: key,
                      label: ASPECT_RATIOS[key].label,
                      hint: ASPECT_RATIOS[key].hint,
                      preview: (
                        <AspectRatioPreview
                          w={ASPECT_RATIOS[key].box.w}
                          h={ASPECT_RATIOS[key].box.h}
                        />
                      ),
                    }),
                  )}
                />
                <OptionPopover
                  value={tier}
                  onChange={(value) => setTier(value as ImageModelTier)}
                  triggerLabel={IMAGE_MODELS[tier].label}
                  triggerIcon={IMAGE_MODELS[tier].icon}
                  columns={1}
                  options={(Object.keys(IMAGE_MODELS) as ImageModelTier[]).map(
                    (key) => ({
                      value: key,
                      label: IMAGE_MODELS[key].label,
                      hint: IMAGE_MODELS[key].hint,
                      icon: IMAGE_MODELS[key].icon,
                    }),
                  )}
                />
                <OptionPopover
                  value={String(count)}
                  onChange={(value) => setCount(Number(value))}
                  triggerLabel={`${count} image${count > 1 ? "s" : ""}`}
                  columns={2}
                  options={IMAGE_COUNTS.map((value) => ({
                    value: String(value),
                    label: `${value} image${value > 1 ? "s" : ""}`,
                    preview: <CountPreview count={value} />,
                  }))}
                />
              </>
            ) : (
              <OptionPopover
                value={diagramType}
                onChange={(value) =>
                  setDiagramType(value as MermaidDiagramType)
                }
                triggerLabel={
                  MERMAID_DIAGRAM_TYPES.find(
                    (entry) => entry.id === diagramType,
                  )?.label ?? "Type"
                }
                triggerIcon={
                  MERMAID_DIAGRAM_TYPES.find(
                    (entry) => entry.id === diagramType,
                  )?.icon
                }
                columns={2}
                options={MERMAID_DIAGRAM_TYPES.map((entry) => ({
                  value: entry.id,
                  label: entry.label,
                  hint: entry.hint,
                  icon: entry.icon,
                }))}
              />
            )}
          </PromptInputTools>

          <PromptInputSubmit
            disabled={!description.trim() || isGenerating}
            status={isGenerating ? "submitted" : "ready"}
          />
        </PromptInputFooter>
      </PromptInput>
      <div className="mt-3">
        <Suggestions>
          {VISUAL_SUGGESTIONS[mode].map(({ text, icon: Icon }) => (
            <Suggestion key={text} suggestion={text} onClick={setDescription}>
              <Icon className="size-3.5" aria-hidden="true" />
              {text}
            </Suggestion>
          ))}
        </Suggestions>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      {results.length > 0 ? (
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Your visuals
          </p>
          <Masonry
            breakpointCols={MASONRY_BREAKPOINTS}
            className="-ml-4 flex w-auto"
            columnClassName="pl-4 bg-clip-padding"
          >
            {results.map((visual, index) =>
              visual.kind === "pending" ? (
                <PendingCard
                  key={visual.id ?? index}
                  createdAt={visual.createdAt}
                />
              ) : (
                <VisualCard
                  key={visual.id ?? `${visual.kind}-${index}`}
                  visual={visual}
                  onMermaidInvalid={repairMermaid}
                />
              ),
            )}
          </Masonry>
        </div>
      ) : null}
    </section>
  );
}

const PENDING_MESSAGES = [
  { after: 0, text: "Generating..." },
  { after: 4000, text: "Sketching details..." },
  { after: 9000, text: "Almost done..." },
] as const;

function PendingCard({ createdAt }: { createdAt?: number }) {
  const [message, setMessage] = useState<string>(PENDING_MESSAGES[0].text);

  useEffect(() => {
    const start = createdAt ?? Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const next = [...PENDING_MESSAGES]
        .reverse()
        .find((step) => elapsed >= step.after);
      if (next) setMessage(next.text);
    }, 500);
    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <div className="mb-4 flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-muted/40">
      <div className="size-8 animate-pulse rounded-full bg-muted-foreground/20" />
      <Shimmer className="text-xs">{message}</Shimmer>
    </div>
  );
}

function VisualCard({
  visual,
  onMermaidInvalid,
}: {
  visual: GeneratedVisual;
  onMermaidInvalid: (code: string, error: string) => void;
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
      {visual.kind === "image" && visual.image_url ? (
        // UploadThing serves these; plain img avoids next/image remote config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={visual.image_url}
          alt={visual.title ?? "Generated visual"}
          loading="lazy"
          className="w-full bg-muted"
        />
      ) : null}

      {visual.kind === "mermaid" && visual.mermaid_code ? (
        <div className="p-3">
          <MermaidPreview
            code={visual.mermaid_code}
            onInvalid={(parserError) =>
              onMermaidInvalid(visual.mermaid_code!, parserError)
            }
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {visual.title}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {visual.prompt ? <PromptPopover prompt={visual.prompt} /> : null}
          {visual.kind === "mermaid" && visual.mermaid_code ? (
            <CodePopover code={visual.mermaid_code} />
          ) : null}
          <DownloadButton visual={visual} />
        </div>
      </div>
    </div>
  );
}

function PromptPopover({ prompt }: { prompt: string }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="View original prompt"
          />
        }
      >
        <QuoteIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverPopup side="top" align="end" className="w-72">
        <p className="text-xs text-foreground">{prompt}</p>
      </PopoverPopup>
    </Popover>
  );
}

function CodePopover({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="View Mermaid code"
          />
        }
      >
        <Code2Icon className="size-3.5" />
      </PopoverTrigger>
      <PopoverPopup side="top" align="end" className="w-80">
        <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-2 text-[11px] leading-relaxed text-foreground">
          {code}
        </pre>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 w-full"
          onClick={copy}
        >
          {copied ? "Copied" : "Copy code"}
        </Button>
      </PopoverPopup>
    </Popover>
  );
}

function DownloadButton({ visual }: { visual: GeneratedVisual }) {
  const [isBusy, setIsBusy] = useState(false);
  const filename = slugify(visual.title);

  const download = async () => {
    setIsBusy(true);
    try {
      if (visual.kind === "image" && visual.image_url) {
        // Fetches the original file straight from UploadThing — same bytes
        // that were generated, no re-compression — so this is full quality.
        const response = await fetch(visual.image_url);
        const blob = await response.blob();
        triggerDownload(URL.createObjectURL(blob), `${filename}.png`);
      } else if (visual.mermaid_code) {
        const blob = new Blob([visual.mermaid_code], { type: "text/plain" });
        triggerDownload(URL.createObjectURL(blob), `${filename}.mmd`);
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Button
      size="icon-xs"
      variant="ghost"
      aria-label="Download"
      disabled={isBusy}
      onClick={download}
    >
      <DownloadIcon className="size-3.5" />
    </Button>
  );
}

function triggerDownload(href: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

function slugify(name?: string) {
  return (
    (name ?? "visual")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "visual"
  );
}
