"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  CircleHelpIcon,
  HomeIcon,
  MessagesSquareIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PenLineIcon,
  Settings2Icon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
type MainItem = {
  title: string
  url: string
  icon: LucideIcon
  subtitle?: string
}

const topItems: MainItem[] = [
  {
    title: "New session",
    url: "/dashboard/talk",
    icon: PenLineIcon,
  },
  {
    title: "Discover",
    url: "/dashboard/discover",
    icon: SparklesIcon,
  },
  {
    title: "Home chat",
    url: "/dashboard",
    icon: HomeIcon,
    subtitle: "Hey, I'm Pi - your personal AI tutor",
  },
]

const todayItems = [
  {
    title: "Chat Helper 😊",
    preview: "Hey! 😊 What's on your mind today?",
    active: true,
  },
]

const footerItems = [
  { title: "Help & feedback", icon: CircleHelpIcon, url: "#" },
  { title: "Settings", icon: Settings2Icon, url: "#" },
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
      <SidebarHeader className="border-b border-border px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
            <Image
              src="/unlockpi-logo.png"
              alt="Unlock PI logo"
              width={30}
              height={30}
              className="size-7 rounded-md object-cover"
              priority
            />
            <span className="truncate text-base font-semibold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
              Unlock PI
            </span>
          </Link>
          <SidebarCollapseButton />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu className="gap-1">
          {topItems.map((item) => {
            const isActive =
              pathname === item.url ||
              (item.url !== "/dashboard" && pathname.startsWith(item.url))

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={<Link href={item.url} />}
                  tooltip={item.title}
                  isActive={isActive}
                  className={cn(
                    "h-auto min-h-10 items-start gap-2.5 py-2",
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

        <SidebarGroup className="pt-4">
          <SidebarGroupLabel className="px-2 text-[13px] font-semibold text-muted-foreground">
            Today
          </SidebarGroupLabel>
          <SidebarMenu className="mt-1 gap-1">
            {todayItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={item.active}
                  className="h-auto min-h-12 items-start gap-2.5 py-2"
                >
                  <MessagesSquareIcon className="hidden size-4 shrink-0 group-data-[collapsible=icon]:inline" />
                  <div className="grid min-w-0 gap-0.5 group-data-[collapsible=icon]:hidden">
                    <span className="truncate">{item.title}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {item.preview}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-border px-2 py-3">
        <SidebarMenu className="gap-1">
          {footerItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                render={<a href={item.url} />}
                tooltip={item.title}
                className="h-10 gap-2.5"
              >
                <item.icon className="size-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {item.title}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
