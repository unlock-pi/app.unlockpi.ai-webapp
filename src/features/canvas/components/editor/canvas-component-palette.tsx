"use client";

import { Drawer, usePuck } from "@puckeditor/core";

import {
  CanvasDrawerItem,
  drawerItemMeta,
} from "@/features/canvas/components/canvas-puck-overrides";
import { canvasPuckConfig } from "@/features/canvas/components/canvas-puck-config";
import { cn } from "@/lib/utils";

type CanvasComponentName = keyof typeof canvasPuckConfig.components & string;
type PaletteLayout = "blocks" | "rows";

type PaletteSection = {
  components: CanvasComponentName[];
  id: string;
  layout: PaletteLayout;
  title: string;
};

const paletteSections: PaletteSection[] = [
  {
    id: "text",
    title: "Text",
    layout: "rows",
    components: ["HeadingTextBlock", "SubheadingTextBlock", "BodyTextBlock"],
  },
  {
    id: "blocks",
    title: "Blocks",
    layout: "blocks",
    components: [
      "SlideBlock",
      "CheckpointBlock",
      "ArrayBlock",
      "StackBlock",
      "QueueBlock",
      "LinkedListBlock",
      "MindMapBlock",
      "CodeBlock",
      "MermaidBlock",
      "TableBlock",
    ],
  },
];

const paletteLayoutClassNames: Record<PaletteLayout, string> = {
  blocks:
    "[&_[data-puck-drawer]]:grid-cols-2 [&_[data-puck-drawer]>div]:min-w-0",
  rows: "[&_[data-puck-drawer]]:grid-cols-1",
};

export function CanvasComponentPalette() {
  return (
    <div className="canvas-component-palette grid gap-5">
      {paletteSections.map((section) => (
        <CanvasPaletteSection key={section.id} section={section} />
      ))}
    </div>
  );
}
function CanvasPaletteSection({ section }: { section: PaletteSection }) {
  return (
    <section className="grid gap-3">
      <p className="px-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {section.title} 
      </p>

      <div
        className={cn(
          "min-w-0 [&_[data-puck-drawer]]:grid  [&_[data-puck-drawer]]:gap-2.5 ",
          paletteLayoutClassNames[section.layout],
        )}
      >
        <Drawer>
          <div className={cn(
            section.layout === "blocks" ? "grid grid-cols-3 gap-2.5" : "grid grid-cols-1 gap-2.5"
          )}>
            {section.components.map((componentName) => (
              <PaletteDrawerItem
                key={componentName}
                layout={section.layout}
                name={componentName}
              />
            ))}
          </div>
        </Drawer>
      </div>
    </section>
  );
}

function PaletteDrawerItem({
  layout,
  name,
}: {
  layout: PaletteLayout;
  name: CanvasComponentName;
}) {
  const { getPermissions } = usePuck<typeof canvasPuckConfig>();
  const canInsert = getPermissions({ type: name }).insert;

  return (
    <Drawer.Item
      label={getComponentLabel(name)}
      name={name}
      isDragDisabled={!canInsert}
    >
      {({ name: drawerName }) => (
        <CanvasDrawerItem compact={layout === "blocks"} name={drawerName} />
      )}
    </Drawer.Item>
  );
}

function getComponentLabel(componentName: CanvasComponentName) {
  return (
    canvasPuckConfig.components[componentName]?.label ??
    drawerItemMeta[componentName]?.label ??
    componentName
  );
}
