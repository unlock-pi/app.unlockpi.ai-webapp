"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  CircleHelpIcon,
  FolderIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PenLineIcon,
  Settings2Icon,
} from "lucide-react"
import type { ComponentType } from "react"
import { VscCommentDiscussionSparkle } from "react-icons/vsc"

import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

type MainItem = {
  title: string
  url: string
  icon: ComponentType<{ className?: string }>
  subtitle?: string
}

const topItems: MainItem[] = [
  {
    title: "Interviews",
    url: "/dashboard/interview",
    icon: VscCommentDiscussionSparkle,
  },
  {
    title: "Courses",
    url: "/dashboard/courses",
    icon: FolderIcon,
  },
  {
    title: "Projects",
    url: "/dashboard/projects",
    icon: FolderIcon,
  },
]

const quickAction = {
  title: "New session",
  url: "/dashboard/session/new",
  icon: PenLineIcon,
  hint: "Open session intake and start teaching flow",
}

const footerItems = [
  { title: "Help & feedback", icon: CircleHelpIcon, url: "#" },
  { title: "Settings", icon: Settings2Icon, url: "/dashboard/settings" },
]

function SidebarCollapseButton() {
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {isCollapsed ? (
        <PanelLeftOpenIcon className="size-4" />
      ) : (
        <PanelLeftCloseIcon className="size-4" />
      )}
    </button>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { state: sidebarState, toggleSidebar } = useSidebar()
  const isSidebarCollapsed = sidebarState === "collapsed"

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "**:data-[slot=sidebar-menu-button]:rounded-xl",
        "**:data-[slot=sidebar-menu-button]:text-sm **:data-[slot=sidebar-menu-button]:font-medium",
        "[&_[data-slot=sidebar-menu-button][data-active=true]]:bg-accent [&_[data-slot=sidebar-menu-button][data-active=true]]:text-accent-foreground"
      )}
      {...props}
    >
      <SidebarHeader className="border-b border-border p-3">
        <div
          className={cn(
            "flex items-center gap-2",
            isSidebarCollapsed ? "justify-center" : "justify-between"
          )}
        >
          <Link
            href="/dashboard"
            onClick={(event) => {
              if (!isSidebarCollapsed) {
                return
              }

              event.preventDefault()
              toggleSidebar()
            }}
            className="group/logo relative flex min-w-0 items-center gap-2 rounded-md"
          >
            <Image
              src="/unlockpi-logo.png"
              alt="Unlock PI logo"
              width={30}
              height={30}
              className="size-7 rounded-md object-cover"
              priority
            />
            <span className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-md bg-sidebar-accent/85 text-sidebar-accent-foreground opacity-0 transition-opacity group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:group-hover/logo:opacity-100">
              <PanelLeftOpenIcon className="size-4" />
            </span>
            <span className="truncate text-base font-semibold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
              Unlock PI
            </span>
          </Link>
          <div className="group-data-[collapsible=icon]:hidden">
            <SidebarCollapseButton />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarMenu className="gap-1 pt-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href={quickAction.url} />}
              tooltip={quickAction.title}
              className="h-auto min-h-10 items-start gap-2.5 py-2 group-data-[collapsible=icon]:items-center"
            >
              <quickAction.icon className="mt-0.5 size-4 shrink-0" />
              <div className="grid min-w-0 gap-0.5 group-data-[collapsible=icon]:hidden">
                <span className="truncate">{quickAction.title}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {quickAction.hint}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {topItems.map((item) => {
            const isActive =
              pathname === item.url ||
              (item.url === "/dashboard/projects" && pathname.startsWith("/dashboard/project/")) ||
              (item.url !== "/dashboard" && pathname.startsWith(item.url))

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={<Link href={item.url} />}
                  tooltip={item.title}
                  isActive={isActive}
                  className={cn(
                    "h-auto min-h-10 items-start gap-2.5 py-2 group-data-[collapsible=icon]:items-center",
                    item.subtitle ? "min-h-14" : ""
                  )}
                >
                  <item.icon className="mt-0.5 size-4 shrink-0" />
                  <div className="grid min-w-0 gap-0.5 group-data-[collapsible=icon]:hidden">
                    <span className="truncate">{item.title}</span>
                    {item.subtitle ? (
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {item.subtitle}
                      </span>
                    ) : null}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

        {/* Projects and sessions used to be fetched and rendered here.
            They now live on dedicated workspace pages so the sidebar stays focused on top-level navigation. */}
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-border px-2 py-3">
        <SidebarMenu className="gap-1">
          {footerItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                render={<a href={item.url} />}
                tooltip={item.title}
                className="h-10 gap-2.5 group-data-[collapsible=icon]:justify-center"
              >
                <item.icon className="size-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
