"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

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
      <AppSidebar variant="inset" currentUser={currentUser} />
      <SidebarInset>
        <main className="flex flex-1 flex-col">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
