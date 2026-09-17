"use client"

import type { ReactNode } from "react"
import { LayoutDashboard, BookOpen, Folder, Users, Settings, Building2, ChevronRight, PieChart } from "lucide-react"
import Link from "next/link"
import { cn } from "@/web/lib/utils"
import { useTranslations } from "next-intl"

type SidebarProps = {
  active?: string
  isAdmin?: boolean
  footer?: ReactNode
}

export function Sidebar({ active = "dashboard", isAdmin, footer }: SidebarProps) {
  const tMenu = useTranslations("menu")
  const tLayout = useTranslations("layout")

  const mainItems = [
    { key: "dashboard", label: tMenu("dashboard"), icon: <LayoutDashboard className="w-4 h-4" />, href: "/dashboard" },
    ...(isAdmin ? [{ key: "config", label: tMenu("settings"), icon: <Settings className="w-4 h-4" />, href: "/dashboard" }] : []),
  ]

  const configChildren = isAdmin
    ? [
        { key: "usuarios", label: tMenu("users"), icon: <Users className="w-4 h-4" />, href: "/admin/users" },
        { key: "admin-trilhas", label: tMenu("tracks"), icon: <BookOpen className="w-4 h-4" />, href: "/admin/learning-paths" },
        { key: "companies", label: "Empresas", icon: <Building2 className="w-4 h-4" />, href: "/admin/settings/companies" },
        { key: "reports", label: tMenu("reports"), icon: <PieChart className="w-4 h-4" />, href: "/admin/settings/reports" },
        { key: "translations", label: tMenu("translations"), icon: <Folder className="w-4 h-4" />, href: "/admin/settings/translations" },
      ]
    : []

  const isChildActive = (key: string) => {
    if (active === key) return true
    if (key === "admin-trilhas" && active === "trilhas") return true
    return false
  }

  return (
    <aside className="flex flex-col text-foreground h-full min-h-0">
      <div className="flex flex-col gap-8 flex-1 min-h-0 overflow-y-auto pr-1">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 shadow-glow flex items-center justify-center">
            <div className="w-5 h-5 rounded-md bg-muted/20" />
          </div>
          <span className="text-lg font-semibold text-foreground">{tLayout("appName")}</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 mt-1 text-sm">
          {mainItems.map((item) => {
            const childActive = item.key === "config" && configChildren.some((c) => isChildActive(c.key))
            const isActive = active === item.key || childActive
            return (
              <div key={item.key} className="flex flex-col gap-1">
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200",
                    isActive 
                      ? "bg-gradient-to-r from-blue-500/20 to-blue-600/10 text-blue-400 border-l-2 border-blue-500" 
                      : "hover:bg-muted/5 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                      isActive 
                        ? "bg-blue-500 text-white shadow-glow-sm" 
                        : "bg-muted/5 text-muted-foreground group-hover:bg-muted/10 group-hover:text-foreground"
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                  {item.key === "config" && isAdmin && (
                    <ChevronRight className={cn(
                      "w-4 h-4 ml-auto transition-transform duration-200",
                      childActive && "rotate-90"
                    )} />
                  )}
                </Link>
                
                {/* Sub-menu for admin */}
                {item.key === "config" && isAdmin && (
                  <div className="ml-4 pl-4 border-l border-border/50 flex flex-col gap-1 mt-1">
                    {configChildren.map((child) => (
                      <Link
                        key={child.key}
                        href={child.href}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200",
                          isChildActive(child.key) 
                            ? "bg-blue-500/10 text-blue-400" 
                            : "text-muted-foreground hover:bg-muted/5 hover:text-foreground"
                        )}
                      >
                        <span className={cn(
                          "transition-colors duration-200",
                          isChildActive(child.key) ? "text-blue-400" : "text-muted-foreground group-hover:text-foreground"
                        )}>
                          {child.icon}
                        </span>
                        <span className="font-medium text-sm">{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {footer && <div className="pt-4 shrink-0">{footer}</div>}
    </aside>
  )
}
