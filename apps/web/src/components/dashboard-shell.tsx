"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { UserNav } from "@/components/user-nav";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type DashboardUser = {
  avatarUrl: string | null;
  email: string;
  name: string;
};

type DashboardShellProps = {
  children: ReactNode;
  currentUser: DashboardUser;
  shellStyle: CSSProperties;
};

export function DashboardShell({
  children,
  currentUser,
  shellStyle,
}: DashboardShellProps) {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter(Boolean);
  const isInsideCourseLesson =
    pathSegments[0] === "dashboard" &&
    pathSegments[1] === "courses" &&
    pathSegments.length > 3;
  const isInsideCanvas =
    pathSegments[0] === "dashboard" &&
    pathSegments[1] === "canvas" &&
    pathSegments.length > 2;

  if (isInsideCanvas) {
    return <main className="flex h-svh min-h-0 flex-1 flex-col overflow-hidden">{children}</main>;
  }

  if (isInsideCourseLesson) {
    return <main className="flex min-h-svh flex-1 flex-col">{children}</main>;
  }

  return (
    <SidebarProvider style={shellStyle}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        {/*
          Account chrome lives here rather than in each page so it lands in
          the same spot everywhere. Note this is the sidebar branch only —
          the canvas editor and course lessons return above with no shell,
          so they keep their own headers and never get this bar.

          The SidebarTrigger is on the left because on mobile the sidebar
          collapses to a sheet and its internal collapse button goes with
          it, leaving no way back to navigation.
        */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3  border-border/50 bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="ml-auto">
            <UserNav currentUser={currentUser} />
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
