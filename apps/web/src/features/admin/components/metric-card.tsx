import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
const frameworkOptions = [
  { label: "Next.js", value: "next" },
  { label: "Vite", value: "vite" },
  { label: "Remix", value: "remix" },
  { label: "Astro", value: "astro" },
];
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <CardFrame className="w-full max-w-xs">
      <CardFrameHeader className={cn(" py-2", detail ? "flex flex-row gap-2" : "py-3")}>
        <CardFrameTitle className="font-light text-xs!">{label}</CardFrameTitle>
        {detail ? (
          <Popover>
            <PopoverTrigger
              openOnHover
              render={
                <Button
                  aria-label="Password requirements"
                  size="icon-xs"
                  variant="ghost"
                />
              }
            >
              <InfoIcon />
            </PopoverTrigger>
            <PopoverPopup side="top" tooltipStyle>
              <p>{detail}</p>
            </PopoverPopup>
          </Popover>
        ) : null}
      </CardFrameHeader>
      <Card >
        <CardPanel className="py-4">
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        </CardPanel>
      </Card>
    </CardFrame>
  );
  return (
    <Card className="shadow-xs/5">
      <CardPanel className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <span className="grid size-7 place-items-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {detail ? (
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </CardPanel>
    </Card>
  );
}
