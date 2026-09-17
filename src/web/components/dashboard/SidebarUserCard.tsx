"use client"

import { useEffect, useState } from "react"
import { Building2 } from "lucide-react"
import { Card, CardContent } from "@/web/components/ui/card"
import { Badge } from "@/web/components/ui/badge"
import { UserMenu } from "@/web/components/dashboard/UserMenu"

type PartnerProfile = {
  id: string
  name: string
}

type Company = {
  name?: string | null
  logoUrl?: string | null
}

type UserInfo = {
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
  company?: Company | null
  partnerProfiles?: PartnerProfile[] | null
}

type SidebarUserCardProps = {
  user?: UserInfo | null
}

export function SidebarUserCard({ user: userProp }: SidebarUserCardProps) {
  const [fetchedUser, setFetchedUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    if (userProp) return
    let active = true

    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
        if (!res.ok) {
          if (active) setFetchedUser(null)
          return
        }
        const data = await res.json()
        if (active) {
          setFetchedUser(data?.user ?? null)
        }
      } catch (err) {
        if (active) setFetchedUser(null)
      }
    }

    loadUser()
    return () => {
      active = false
    }
  }, [userProp])

  const resolvedUser = userProp ?? fetchedUser
  const displayUser: UserInfo = resolvedUser ?? {
    firstName: "Usuário",
    lastName: "",
    avatarUrl: null,
    company: null,
    partnerProfiles: null,
  }

  const initials = `${displayUser.firstName?.[0] ?? "U"}${displayUser.lastName?.[0] ?? ""}`
  const companyLogo = displayUser.company?.logoUrl ?? ""
  const companyName = displayUser.company?.name ?? "Sem empresa"
  const displayName = [displayUser.firstName, displayUser.lastName].filter(Boolean).join(" ").trim() || "Usuário"

  return (
    <Card className="glass-card border-border/50 rounded-2xl hover-card relative z-30 overflow-visible shrink-0">
      <CardContent className="py-4 px-5">
        <div className="flex items-center gap-4">
          <UserMenu initials={initials} imageUrl={displayUser.avatarUrl ?? undefined} />
          <div className="h-14 w-14 rounded-xl border border-border/50 bg-muted/50 flex items-center justify-center overflow-hidden">
            {companyLogo ? (
              <img src={companyLogo} alt={`Logo ${companyName}`} className="h-full w-full object-contain" />
            ) : (
              <div className="h-full w-full bg-muted flex items-center justify-center text-muted-foreground">
                <Building2 className="w-5 h-5" />
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 min-w-0 leading-tight">
          <div className="text-sm font-semibold text-foreground truncate">{displayName}</div>
          <div className="text-xs text-muted-foreground truncate">{companyName}</div>
        </div>
        {resolvedUser?.partnerProfiles && resolvedUser.partnerProfiles.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {resolvedUser.partnerProfiles.map((p) => (
              <Badge key={p.id} className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">
                {p.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
