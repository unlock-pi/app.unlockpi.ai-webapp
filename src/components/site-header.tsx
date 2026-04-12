import Link from "next/link"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-(--color-darker-gray) transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-2 px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1 md:hidden" />
          <h1 className="text-base font-medium">Unlock PI</h1>
        </div>

        <Button
          variant="default"
          size="sm"
          render={<Link href="/dashboard/classroom" />}
          nativeButton={false}
        >
          Present Mode
        </Button>
      </div>
    </header>
  )
}
