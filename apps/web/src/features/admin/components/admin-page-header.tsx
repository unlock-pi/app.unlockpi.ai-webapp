import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Server-safe page heading for admin sub-routes. Kept out of the "use client"
 * admin-shell so server pages can pass an `icon` component to it (components
 * can't cross the server→client boundary as props).
 */
export function AdminPageHeader({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-0">
        {Icon ? (
          <span className="grid size-9 place-items-center text-muted-foreground">
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
        ) : null}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}
