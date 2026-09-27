import {
  CheckCircle2Icon,
  GitBranchIcon,
  ImageIcon,
  TableIcon,
} from "lucide-react";
import { PiChalkboardDuotone } from "react-icons/pi";

import type { CanvasDocument } from "@/features/canvas/types/canvas-types";
import {
  getFirstFramePreviewItems,
  type CanvasPreviewItem,
} from "@/features/project/lib/canvas-preview";
import { cn } from "@/lib/utils";

type CanvasMiniPreviewProps = {
  document: CanvasDocument | null;
  className?: string;
};

/**
 * Schematic stand-in for a real thumbnail: no canvas render pipeline runs
 * here, we just look at the first frame's block types and sketch them as
 * bars/chips/icons so a card gives a rough sense of what's inside.
 */
export function CanvasMiniPreview({ document, className }: CanvasMiniPreviewProps) {
  const items = getFirstFramePreviewItems(document);

  const sketchImage = items.find(
    (item) => item.type === "SketchBlock" && typeof item.props.src === "string",
  );

  if (sketchImage) {
    return (
      <div className={cn("overflow-hidden bg-muted/40", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sketchImage.props.src as string}
          alt=""
          className="size-full object-cover"
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden bg-muted/25 text-primary",
          className,
        )}
      >
        <PiChalkboardDuotone className="size-5" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col justify-center gap-1 overflow-hidden bg-muted/40 p-2.5",
        className,
      )}
    >
      {items.map((item, index) => (
        <PreviewBlock key={index} item={item} />
      ))}
    </div>
  );
}

function PreviewBlock({ item }: { item: CanvasPreviewItem }) {
  switch (item.type) {
    case "HeadingTextBlock":
      return <div className="h-1.5 w-3/4 rounded-full bg-foreground/60" />;
    case "SubheadingTextBlock":
      return <div className="h-1 w-1/2 rounded-full bg-foreground/40" />;
    case "BodyTextBlock":
      return (
        <div className="flex flex-col gap-0.5">
          <div className="h-0.5 w-full rounded-full bg-foreground/25" />
          <div className="h-0.5 w-5/6 rounded-full bg-foreground/25" />
        </div>
      );
    case "ArrayBlock":
    case "StackBlock":
    case "QueueBlock":
    case "LinkedListBlock":
      return (
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-2.5 w-2.5 rounded-[2px] bg-primary/50" />
          ))}
        </div>
      );
    case "CodeBlock":
      return (
        <div className="flex flex-col gap-0.5 rounded-[3px] bg-foreground/85 p-1">
          <div className="h-0.5 w-1/2 rounded-full bg-background/70" />
          <div className="h-0.5 w-2/3 rounded-full bg-background/50" />
          <div className="h-0.5 w-1/3 rounded-full bg-background/50" />
        </div>
      );
    case "MermaidBlock":
    case "MindMapBlock":
      return <GitBranchIcon className="size-3.5 text-foreground/40" />;
    case "TableBlock":
      return <TableIcon className="size-3.5 text-foreground/40" />;
    case "CheckpointBlock":
      return <CheckCircle2Icon className="size-3.5 text-foreground/40" />;
    case "SketchBlock":
      return <ImageIcon className="size-3.5 text-foreground/40" />;
    default:
      return null;
  }
}
