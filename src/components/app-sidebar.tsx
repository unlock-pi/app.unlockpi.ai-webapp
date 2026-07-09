"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  CircleHelpIcon,
  FolderIcon,
  LogOutIcon,
  MessageSquareIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PenLineIcon,
  Settings2Icon,
  Sun,
} from "lucide-react";
import { useEffect, useState, type ComponentProps, type ComponentType } from "react";
import { PiChalkboardDuotone } from "react-icons/pi";
import { useTheme } from "next-themes";

import { createClient } from "@/lib/client";
import { cn } from "@/lib/utils";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
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
} from "@/components/ui/sidebar";

type MainItem = {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  subtitle?: string;
};

type SidebarUser = {
  name: string;
  email: string;
};

const topItems: MainItem[] = [
  // {
  //   title: "Interviews",
  //   url: "/dashboard/interview",
  //   icon: VscCommentDiscussionSparkle,
  // },
  {
    title: "Courses",
    url: "/dashboard/courses",
    icon: PenLineIcon,
  },
  {
    title: "Projects",
    url: "/dashboard/projects",
    icon: FolderIcon,
  },
];

const quickAction = {
  title: "Canvas",
  url: "/dashboard/canvas",
  icon: PiChalkboardDuotone,
};

function SidebarCollapseButton() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

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
  );
}

export function AppSidebar({
  currentUser,
  ...props
}: ComponentProps<typeof Sidebar> & {
  currentUser?: SidebarUser;
}) {
  const pathname = usePathname();
  const { push, replace, refresh } = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { state: sidebarState, toggleSidebar, isMobile } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const isSidebarCollapsed = sidebarState === "collapsed";
  const isLightTheme = isMounted && resolvedTheme === "light";
  const userInitial = currentUser?.name?.trim().charAt(0).toUpperCase() || "U";
  const isCanvasActive = pathname === quickAction.url;

  useEffect(() => {
    // next-themes reports `resolvedTheme` as undefined on the server, so this
    // one-time mount flag is required to avoid a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const navigateTo = (href: string) => {
    push(href);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    replace("/auth/login");
    refresh();
  };

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "**:data-[slot=sidebar-menu-button]:rounded-xl",
        "**:data-[slot=sidebar-menu-button]:text-sm **:data-[slot=sidebar-menu-button]:font-medium",
        "[&_[data-slot=sidebar-menu-button][data-active=true]]:bg-accent [&_[data-slot=sidebar-menu-button][data-active=true]]:text-accent-foreground",
      )}
      {...props}
    >
      <SidebarHeader className="border-b border-border p-3">
        <div
          className={cn(
            "flex items-center gap-2",
            isSidebarCollapsed ? "justify-center" : "justify-between",
          )}
        >
          <Link
            href="/dashboard"
            onClick={(event) => {
              if (!isSidebarCollapsed) {
                return;
              }

              event.preventDefault();
              toggleSidebar();
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
              isActive={isCanvasActive}
              className="h-auto min-h-10 items-start gap-2.5 py-2 group-data-[collapsible=icon]:items-center"
            >
              <quickAction.icon className="mt-0.5 size-4 shrink-0" />
              <div className="grid min-w-0 gap-0.5 group-data-[collapsible=icon]:hidden">
                <span className="truncate">{quickAction.title}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {topItems.map((item) => {
            const isActive =
              pathname === item.url ||
              (item.url === "/dashboard/projects" &&
                pathname.startsWith("/dashboard/project/")) ||
              (item.url !== "/dashboard" && pathname.startsWith(item.url));

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={<Link href={item.url} />}
                  tooltip={item.title}
                  isActive={isActive}
                  className={cn(
                    "h-auto min-h-10 items-start gap-2.5 py-2 group-data-[collapsible=icon]:items-center",
                    item.subtitle ? "min-h-14" : "",
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
            );
          })}
        </SidebarMenu>

        {/* Projects and sessions used to be fetched and rendered here.
            They now live on dedicated workspace pages so the sidebar stays focused on top-level navigation. */}
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-border px-2 py-3">
        {currentUser ? (
          <SidebarMenu className="mt-2">
            <SidebarMenuItem>
              <Menu>
                <MenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      tooltip={currentUser.name}
                      className="h-auto min-h-12 items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-3 aria-expanded:bg-accent/50"
                    />
                  }
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                    {userInitial}
                  </div>
                  <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-medium text-foreground">
                      {currentUser.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {currentUser.email}
                    </span>
                  </div>
                </MenuTrigger>

                <MenuPopup
                  className="min-w-56"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={6}
                >
                  <MenuGroup>
                    <MenuGroupLabel>
                      <div className="flex items-center gap-3 px-1 py-1.5 text-left">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                          {userInitial}
                        </div>
                        <div className="grid min-w-0 flex-1 leading-tight">
                          <span className="truncate text-sm font-medium text-foreground">
                            {currentUser.name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {currentUser.email}
                          </span>
                        </div>
                      </div>
                    </MenuGroupLabel>
                  </MenuGroup>
                  <MenuSeparator />
                  <MenuItem onClick={() => navigateTo("/dashboard/settings")}>
                    <Settings2Icon className="size-4" />
                    Settings
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogOutIcon className="size-4" />
                    Log out
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem onClick={() => navigateTo("/dashboard/help")}>
                    <CircleHelpIcon className="size-4" />
                    Help
                  </MenuItem>
                  <MenuItem onClick={() => navigateTo("/dashboard/feedback")}>
                    <MessageSquareIcon className="size-4" />
                    Feedback
                  </MenuItem>
                  <MenuItem
                    onClick={() => setTheme(isLightTheme ? "dark" : "light")}
                  >
                    {isLightTheme ? (
                      <MoonIcon className="size-4" />
                    ) : (
                      <Sun className="size-4" />
                    )}
                    {isLightTheme ? "Dark mode" : "Light mode"}
                  </MenuItem>
                </MenuPopup>
              </Menu>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
