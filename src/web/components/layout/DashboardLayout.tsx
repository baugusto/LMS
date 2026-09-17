import type { ComponentProps } from "react"
import { Sidebar } from "./Sidebar"
import { SidebarUserCard } from "@/web/components/dashboard/SidebarUserCard"

type DashboardLayoutProps = {
  children: React.ReactNode
  right?: React.ReactNode
  sidebarFooter?: React.ReactNode
  active?: string
  isAdmin?: boolean
  user?: ComponentProps<typeof SidebarUserCard>["user"]
  mainOverflow?: "auto" | "hidden" | "visible"
  containerOverflow?: "hidden" | "visible"
}

export function DashboardLayout({
  children,
  right,
  sidebarFooter,
  active = "dashboard",
  isAdmin,
  user,
  mainOverflow = "auto",
  containerOverflow = "visible",
}: DashboardLayoutProps) {
  const hasRight = Boolean(right)
  const resolvedFooter = sidebarFooter === undefined ? <SidebarUserCard user={user} /> : sidebarFooter
  const mainOverflowClass =
    mainOverflow === "visible"
      ? "overflow-visible"
      : mainOverflow === "hidden"
      ? "overflow-hidden"
      : "overflow-y-auto"
  const containerOverflowClass = containerOverflow === "hidden" ? "overflow-hidden" : "overflow-visible"
  return (
    <div className="min-h-[100dvh] flex items-start justify-center px-4 py-4 sm:px-6 sm:py-6 relative z-10">
      <div
        className={`w-full max-w-[1400px] min-h-[calc(100dvh-2rem)] sm:min-h-[calc(100dvh-3rem)] box-border glass-card rounded-3xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6 grid gap-6 ${containerOverflowClass} ${
          hasRight
            ? "grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_320px]"
            : "grid-cols-1 lg:grid-cols-[240px_1fr]"
        }`}
      >
        {/* Sidebar */}
        <div className="glass-sidebar rounded-2xl p-4 sm:p-5 lg:-ml-2 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:max-h-[calc(100dvh-3rem)] lg:self-start">
          <Sidebar active={active} isAdmin={isAdmin} footer={resolvedFooter} />
        </div>
        
        {/* Main Content */}
        <main className={`flex flex-col gap-5 text-foreground ${mainOverflowClass} min-h-0`}>
          {children}
        </main>
        
        {/* Right Sidebar */}
        {hasRight && (
          <aside className="flex flex-col gap-4 text-foreground min-h-0 self-start">
            {right}
          </aside>
        )}
      </div>
    </div>
  )
}
