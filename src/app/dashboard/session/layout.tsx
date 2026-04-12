import type { CSSProperties, ReactNode } from "react"
import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { createClient } from "@/lib/server"

const sessionShellStyle = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
} as CSSProperties

export default async function SessionLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect("/login")
  }

  return (
    <SidebarProvider style={sessionShellStyle}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <main className="flex flex-1 flex-col">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
