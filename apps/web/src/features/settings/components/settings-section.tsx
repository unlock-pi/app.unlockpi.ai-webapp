"use client";

import type { ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Frame, FrameHeader, FramePanel } from "@/components/ui/frame";
import {
  useSettingsSections,
  type SettingsSectionId,
} from "@/features/settings/components/settings-sections-context";

type SettingsSectionProps = {
  id: SettingsSectionId;
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * One collapsible card in the settings panel. Open state is shared through
 * SettingsSectionsProvider rather than owned locally, so a page-level
 * expand-all/collapse-all control and a `#section-id` deep link can both
 * drive it. `id` doubles as the anchor a link like
 * `/dashboard/settings#preferences` scrolls to.
 */
export function SettingsSection({
  id,
  title,
  description,
  children,
}: SettingsSectionProps) {
  const { isOpen, setOpen } = useSettingsSections();

  return (
    <Frame id={id} className="w-full scroll-mt-20">
      <Collapsible open={isOpen(id)} onOpenChange={(open) => setOpen(id, open)}>
        <FrameHeader className="flex-row items-center justify-between px-2 py-2">
          <CollapsibleTrigger
            className="data-panel-open:[&_svg]:rotate-180"
            render={<Button variant="ghost" />}
          >
            <ChevronDownIcon className="size-4 transition-transform duration-200" />
            {title}
          </CollapsibleTrigger>
        </FrameHeader>
        <CollapsiblePanel>
          <FramePanel className="grid gap-6">
            {description ? (
              <p className="-mt-2 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
            {children}
          </FramePanel>
        </CollapsiblePanel>
      </Collapsible>
    </Frame>
  );
}
