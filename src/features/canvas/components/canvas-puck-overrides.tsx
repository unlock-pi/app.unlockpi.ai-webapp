"use client";

import { type FieldProps, type Overrides } from "@puckeditor/core";
import {
  BoxesIcon,
  CheckIcon,
  Code2Icon,
  GitBranchIcon,
  LayoutPanelTopIcon,
  ListChecksIcon,
  NetworkIcon,
  Share2Icon,
  TableIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { canvasPuckConfig } from "@/features/canvas/components/canvas-puck-config";
import type { DrawerItemMeta } from "@/features/canvas/types/canvas-other-types";
import { cn } from "@/lib/utils";

const drawerItemMeta: Record<string, DrawerItemMeta> = {
  SlideBlock: {
    label: "Frame",
    description: "A blank teaching canvas frame",
    icon: LayoutPanelTopIcon,
  },
  Frame: {
    label: "Frame",
    description: "A blank teaching canvas frame",
    icon: LayoutPanelTopIcon,
  },
  HeadingTextBlock: {
    label: "Heading",
    variant: "heading",
  },
  Heading: {
    label: "Heading",
    variant: "heading",
  },
  SubheadingTextBlock: {
    label: "Subheading",
    variant: "subheading",
  },
  Subheading: {
    label: "Subheading",
    variant: "subheading",
  },
  BodyTextBlock: {
    label: "Body",
    variant: "body",
  },
  Body: {
    label: "Body",
    variant: "body",
  },
  CheckpointBlock: {
    label: "Checkpoint",
    description: "Question and expected answer",
    icon: ListChecksIcon,
  },
  Checkpoint: {
    label: "Checkpoint",
    description: "Question and expected answer",
    icon: ListChecksIcon,
  },
  ArrayBlock: {
    label: "Array",
    description: "Resizable indexed elements",
    icon: BoxesIcon,
  },
  Array: {
    label: "Array",
    description: "Resizable indexed elements",
    icon: BoxesIcon,
  },
  LinkedListBlock: {
    label: "Linked list",
    description: "Nodes connected by pointers",
    icon: GitBranchIcon,
  },
  "Linked list": {
    label: "Linked list",
    description: "Nodes connected by pointers",
    icon: GitBranchIcon,
  },
  MindMapBlock: {
    label: "Mind map",
    description: "Concept map with branches",
    icon: NetworkIcon,
  },
  "Mind map": {
    label: "Mind map",
    description: "Concept map with branches",
    icon: NetworkIcon,
  },
  CodeBlock: {
    label: "Code",
    description: "Snippet and explanation",
    icon: Code2Icon,
  },
  Code: {
    label: "Code",
    description: "Snippet and explanation",
    icon: Code2Icon,
  },
  MermaidBlock: {
    label: "Mermaid",
    description: "Diagram from Mermaid syntax",
    icon: Share2Icon,
  },
  Mermaid: {
    label: "Mermaid",
    description: "Diagram from Mermaid syntax",
    icon: Share2Icon,
  },
  TableBlock: {
    label: "Table",
    description: "Rows and columns for comparisons",
    icon: TableIcon,
  },
  Table: {
    label: "Table",
    description: "Rows and columns for comparisons",
    icon: TableIcon,
  },
};

function CanvasDrawerItem({ name }: { name: string }) {
  const meta = drawerItemMeta[name] ?? {
    label: name,
    description: "Drag into a frame",
    icon: BoxesIcon,
  };
  const Icon = meta.icon ?? BoxesIcon;

  if (meta.variant) {
    return (
      <div className="canvas-drawer-card canvas-drawer-card--text">
        <span
          className={cn(
            "block truncate",
            meta.variant === "heading" &&
              "text-[2rem] font-bold tracking-[-0.05em]",
            meta.variant === "subheading" &&
              "text-[1.35rem] tracking-[-0.03em]",
            meta.variant === "body" && "text-base",
          )}
          style={{
            fontFamily:
              meta.variant === "heading"
                ? "var(--font-canvas-heading), var(--font-system), sans-serif"
                : meta.variant === "subheading"
                  ? "var(--font-canvas-subheading), var(--font-system), sans-serif"
                  : "var(--font-canvas-body), var(--font-system), sans-serif",
          }}
        >
          {meta.label}
        </span>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className="canvas-drawer-card canvas-drawer-card--default"
            title={meta.description}
          />
        }
      >
        <>
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-muted/45 text-foreground">
            <Icon className="size-4" />
          </div>
          <p className="min-w-0 truncate text-sm font-semibold text-foreground">
            {meta.label}
          </p>
        </>
      </TooltipTrigger>
      {meta.description ? (
        <TooltipPopup className="max-w-52">{meta.description}</TooltipPopup>
      ) : null}
    </Tooltip>
  );
}

type InspectorFieldOption = {
  label: string;
  value: boolean | number | string;
};

function getInspectorFieldOptions(
  field: FieldProps["field"],
): InspectorFieldOption[] {
  if (!field || !("options" in field) || !Array.isArray(field.options)) {
    return [];
  }

  return field.options.filter(
    (option): option is InspectorFieldOption =>
      typeof option?.label === "string" &&
      ["boolean", "number", "string"].includes(typeof option?.value),
  );
}

function InspectorTextField({ id, onChange, readOnly, value }: FieldProps) {
  return (
    <Input
      id={id}
      disabled={readOnly}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function getInspectorFieldLabel(field: FieldProps["field"]) {
  if (field && "label" in field && typeof field.label === "string") {
    return field.label;
  }

  return "";
}

function InspectorTextareaField({
  field,
  id,
  onChange,
  readOnly,
  value,
}: FieldProps) {
  const fieldLabel = getInspectorFieldLabel(field).toLowerCase();
  const fieldId = (id ?? "").toLowerCase();
  const isCodeEditor =
    fieldLabel === "code" ||
    fieldLabel === "mermaid code" ||
    fieldId.endsWith(".code") ||
    fieldId.endsWith(".chart");

  return (
    <Textarea
      id={id}
      disabled={readOnly}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={isCodeEditor ? false : undefined}
      className={cn(
        "min-h-28",
        isCodeEditor &&
          "rounded-xl border-zinc-800 bg-zinc-950 text-zinc-100 shadow-[0_16px_42px_rgba(0,0,0,0.18)] [&_[data-slot=textarea]]:min-h-52 [&_[data-slot=textarea]]:overflow-auto [&_[data-slot=textarea]]:font-mono [&_[data-slot=textarea]]:text-xs [&_[data-slot=textarea]]:leading-6 [&_[data-slot=textarea]]:text-zinc-100 [&_[data-slot=textarea]]:caret-zinc-100 [&_[data-slot=textarea]]:selection:bg-primary/40",
      )}
    />
  );
}

function InspectorNumberField({ id, onChange, readOnly, value }: FieldProps) {
  return (
    <Input
      id={id}
      type="number"
      disabled={readOnly}
      value={typeof value === "number" ? String(value) : ""}
      onChange={(event) =>
        onChange(
          event.target.value === "" ? undefined : Number(event.target.value),
        )
      }
    />
  );
}

function InspectorSelectField(props: FieldProps) {
  const options = getInspectorFieldOptions(props.field);
  const selectedValue = String(props.value ?? options[0]?.value ?? "");

  return (
    <Select
      value={selectedValue}
      disabled={props.readOnly}
      onValueChange={(nextValue) => {
        const matchingOption = options.find(
          (option) => String(option.value) === nextValue,
        );

        props.onChange(matchingOption?.value ?? nextValue);
      }}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {options.map((option) => (
          <SelectItem
            key={`${props.id}-${option.label}`}
            value={String(option.value)}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

function InspectorRadioField(props: FieldProps) {
  const options = getInspectorFieldOptions(props.field);
  const activeValue = String(props.value ?? "");

  return (
    <RadioGroup
      value={activeValue}
      className={cn(
        "grid gap-2",
        options.length <= 2 ? "sm:grid-cols-2" : "sm:grid-cols-3",
      )}
    >
      {options.map((option) => {
        const optionValue = String(option.value);
        const isActive = optionValue === activeValue;

        return (
          <Button
            key={`${props.id}-${option.label}`}
            type="button"
            variant="outline"
            disabled={props.readOnly}
            aria-pressed={isActive}
            className={cn(
              "justify-start rounded-xl px-3 py-2 text-left transition-[background-color,border-color,box-shadow,transform] active:scale-[0.96]",
              isActive
                ? "border-primary bg-primary/8 text-foreground shadow-[inset_0_0_0_1px_var(--primary)]"
                : "bg-background hover:bg-accent",
            )}
            onClick={() => props.onChange(option.value)}
          >
            {option.label}
            {isActive ? <CheckIcon className="ml-auto size-3.5" /> : null}
          </Button>
        );
      })}
    </RadioGroup>
  );
}

export const canvasPuckOverrides: Partial<Overrides<typeof canvasPuckConfig>> = {
  drawerItem: ({ name }) => <CanvasDrawerItem name={name} />,
  fieldTypes: {
    number: InspectorNumberField,
    radio: InspectorRadioField,
    select: InspectorSelectField,
    text: InspectorTextField,
    textarea: InspectorTextareaField,
  },
};

export function getCanvasAppThemeVars(
  isLightTheme: boolean,
): CSSProperties {
  return {
    "--canvas-app-stage": "var(--background)",
    "--canvas-app-background": "var(--card)",
    "--canvas-app-foreground": "var(--card-foreground)",
    "--canvas-app-card": "var(--card)",
    "--canvas-app-card-foreground": "var(--card-foreground)",
    "--canvas-app-border": "var(--border)",
    "--canvas-app-muted": "var(--muted)",
    "--canvas-app-muted-foreground": "var(--muted-foreground)",
    "--canvas-app-primary": "var(--primary)",
    "--canvas-app-primary-foreground": "var(--primary-foreground)",
    "--canvas-app-shadow-color": isLightTheme
      ? "rgba(15, 23, 42, 0.16)"
      : "rgba(0, 0, 0, 0.36)",
  } as CSSProperties;
}
