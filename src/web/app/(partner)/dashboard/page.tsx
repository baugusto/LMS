import { env } from "@/server/security/owasp"
import { DashboardLayout } from "@/web/components/layout/DashboardLayout"
import { ProgressHighlight, ProgressMiniCard } from "@/web/components/dashboard/ProgressCard"
import { Card, CardContent } from "@/web/components/ui/card"
import { TrendingUp } from "lucide-react"
import { cookies } from "next/headers"
import { DashboardMainContent } from "@/web/components/dashboard/DashboardMainContent"

type DashboardData = {
  recentLearningPaths: any[]
  myLearningPaths: any[]
  progressSummary: any[]
}

async function getData() {
  const base = env.APP_URL
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ")
  const headers = cookieHeader ? { cookie: cookieHeader } : undefined
  try {
    const [meRes, dashRes] = await Promise.all([
      fetch(`${base}/api/auth/me`, { cache: "no-store", headers }),
      fetch(`${base}/api/lms/dashboard`, { cache: "no-store", headers }),
    ])
    if (!meRes.ok) {
      throw new Error("Não autenticado")
    }
    const user = (await meRes.json()).user
    const dashboard: DashboardData = dashRes.ok ? await dashRes.json() : { recentLearningPaths: [], myLearningPaths: [], progressSummary: [] }
    return { user, dashboard }
  } catch (err) {
    console.error("Erro ao carregar dashboard", err)
    return {
      user: null,
      dashboard: { recentLearningPaths: [], myLearningPaths: [], progressSummary: [] },
    }
  }
}

export default async function DashboardPage() {
  const { user, dashboard } = await getData()

  return (
    <DashboardLayout
      active="dashboard"
      isAdmin={user?.role === "ADMIN"}
      user={user}
      right={
        <>
          {/* Progress Card */}
          <Card className="glass-card border-border/50 rounded-2xl hover-card flex flex-col">
            <CardContent className="p-5 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">Progresso das Trilhas</h3>
                </div>
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">Resumo</span>
              </div>
              
              {dashboard.progressSummary.slice(0, 1).map((lp: any) => (
                <ProgressHighlight
                  key={lp.id}
                  percent={lp.progressPercent}
                  title={lp.title}
                  completed={lp.resourcesCompleted}
                  total={lp.resourcesTotal}
                  href={`/tracks/${lp.id}`}
                />
              ))}
              
              <div className="grid gap-3">
                {dashboard.progressSummary.slice(1).map((lp: any) => (
                  <ProgressMiniCard
                    key={lp.id}
                    percent={lp.progressPercent}
                    title={lp.title}
                    text={`${lp.resourcesCompleted} / ${lp.resourcesTotal} recursos`}
                    href={`/tracks/${lp.id}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      }
    >
      <DashboardMainContent
        userFirstName={user?.firstName ?? undefined}
        recentLearningPaths={dashboard.recentLearningPaths}
        myLearningPaths={dashboard.myLearningPaths}
      />
    </DashboardLayout>
  )
}
