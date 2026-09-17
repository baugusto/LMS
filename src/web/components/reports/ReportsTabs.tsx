"use client"

import { useEffect, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/web/components/ui/tabs"
import { CompanyProgressGrid } from "./CompanyProgressGrid"
import { PartnerProfileProgressGrid } from "./PartnerProfileProgressGrid"
import { UserProgressGrid } from "./UserProgressGrid"
import { LearningPathInsightsGrid } from "./LearningPathInsightsGrid"
import { QuizInsightsGrid } from "./QuizInsightsGrid"
import { UserRiskGrid } from "./UserRiskGrid"
import { Card, CardContent } from "@/web/components/ui/card"
import { Button } from "@/web/components/ui/button"
import { Badge } from "@/web/components/ui/badge"
import type { CompanyProgressRow, PartnerProfileProgressRow, UserProgressRow } from "@/server/lms/services/reports.service"
import type { LearningPathInsight, QuizInsight, UserRiskInsight } from "@/server/lms/services/reports.insights.service"

type FilterOption = {
  id: string
  name: string
}

type LearningPathOption = {
  id: string
  title: string
  active: boolean
}

type Props = {
  companies: CompanyProgressRow[]
  profiles: PartnerProfileProgressRow[]
  users: UserProgressRow[]
  companyOptions: FilterOption[]
  partnerProfileOptions: (FilterOption & { active?: boolean })[]
  learningPathOptions: LearningPathOption[]
}

export function ReportsTabs({
  companies,
  profiles,
  users,
  companyOptions,
  partnerProfileOptions,
  learningPathOptions,
}: Props) {
  const [filters, setFilters] = useState({ companyId: "", partnerProfileId: "", learningPathId: "" })
  const [learningPathInsights, setLearningPathInsights] = useState<LearningPathInsight[]>([])
  const [quizInsights, setQuizInsights] = useState<QuizInsight[]>([])
  const [userRiskInsights, setUserRiskInsights] = useState<UserRiskInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.companyId) params.set("companyId", filters.companyId)
    if (filters.partnerProfileId) params.set("partnerProfileId", filters.partnerProfileId)
    if (filters.learningPathId) params.set("learningPathId", filters.learningPathId)
    const qs = params.toString()
    return qs ? `?${qs}` : ""
  }, [filters])

  useEffect(() => {
    let cancelled = false
    const loadInsights = async () => {
      setLoading(true)
      setError(null)
      try {
        const [lpRes, quizRes, riskRes] = await Promise.all([
          fetch(`/api/admin/reports/insights/learning-paths${queryString}`),
          fetch(`/api/admin/reports/insights/quizzes${queryString}`),
          fetch(`/api/admin/reports/insights/user-risk${queryString}`),
        ])

        if (!lpRes.ok || !quizRes.ok || !riskRes.ok) {
          throw new Error("Falha ao carregar insights")
        }

        const [lpData, quizData, riskData] = await Promise.all([lpRes.json(), quizRes.json(), riskRes.json()])
        if (cancelled) return
        setLearningPathInsights(lpData)
        setQuizInsights(quizData)
        setUserRiskInsights(riskData)
      } catch (err) {
        if (!cancelled) {
          setError("Nao foi possivel carregar os insights. Tente novamente.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInsights()
    return () => {
      cancelled = true
    }
  }, [queryString])

  const overviewStats = useMemo(() => {
    const filteredLearningPaths = learningPathOptions.filter(
      (lp) => !filters.learningPathId || lp.id === filters.learningPathId,
    )
    const activePaths = filteredLearningPaths.filter((lp) => lp.active).length
    const avgCompletion =
      learningPathInsights.length > 0
        ? Math.round(learningPathInsights.reduce((sum, row) => sum + row.completionRate, 0) / learningPathInsights.length)
        : 0
    const avgProgress =
      learningPathInsights.length > 0
        ? Math.round(learningPathInsights.reduce((sum, row) => sum + row.avgProgress, 0) / learningPathInsights.length)
        : 0
    const avgTimeValues = learningPathInsights
      .map((row) => row.avgTimeToCompleteDays)
      .filter((value): value is number => typeof value === "number")
    const avgTime =
      avgTimeValues.length > 0 ? Math.round(avgTimeValues.reduce((sum, value) => sum + value, 0) / avgTimeValues.length) : null

    const highRisk = userRiskInsights.filter((row) => row.riskLevel === "HIGH").length
    const mediumRisk = userRiskInsights.filter((row) => row.riskLevel === "MEDIUM").length
    const avgQuizScore =
      quizInsights.length > 0
        ? Math.round(quizInsights.reduce((sum, row) => sum + row.avgScorePercent, 0) / quizInsights.length)
        : 0

    return {
      activePaths,
      avgCompletion,
      avgProgress,
      avgTime,
      highRisk,
      mediumRisk,
      avgQuizScore,
    }
  }, [learningPathOptions, filters.learningPathId, learningPathInsights, quizInsights, userRiskInsights])

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleReset = () => setFilters({ companyId: "", partnerProfileId: "", learningPathId: "" })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_2fr_2fr_1fr] gap-3 items-end">
        <label className="space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Empresa</span>
          <select
            className="w-full rounded-lg border border-brand-border bg-background px-3 py-2 text-sm"
            value={filters.companyId}
            onChange={(e) => handleFilterChange("companyId", e.target.value)}
          >
            <option value="">Todas</option>
            {companyOptions.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Perfil de parceiro</span>
          <select
            className="w-full rounded-lg border border-brand-border bg-background px-3 py-2 text-sm"
            value={filters.partnerProfileId}
            onChange={(e) => handleFilterChange("partnerProfileId", e.target.value)}
          >
            <option value="">Todos</option>
            {partnerProfileOptions.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Trilha</span>
          <select
            className="w-full rounded-lg border border-brand-border bg-background px-3 py-2 text-sm"
            value={filters.learningPathId}
            onChange={(e) => handleFilterChange("learningPathId", e.target.value)}
          >
            <option value="">Todas</option>
            {learningPathOptions.map((path) => (
              <option key={path.id} value={path.id}>
                {path.title}
                {path.active ? "" : " (inativa)"}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Limpar filtros
          </Button>
        </div>
      </div>
      <div className="text-[12px] text-muted-foreground">
        Filtros aplicados aos insights das abas Trilhas, Quizzes e Risco.
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="overview">Visao Geral</TabsTrigger>
          <TabsTrigger value="details">Empresas / Perfis / Usuarios</TabsTrigger>
          <TabsTrigger value="learning-paths">Trilhas & Evolucao</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes & Perguntas</TabsTrigger>
          <TabsTrigger value="risk">Risco & Acoes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <Card className="border border-brand-border shadow-none">
              <CardContent className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground" title="Quantidade de trilhas ativas no escopo atual.">
                  Trilhas ativas
                </div>
                <div className="text-2xl font-semibold">{overviewStats.activePaths}</div>
              </CardContent>
            </Card>
            <Card className="border border-brand-border shadow-none">
              <CardContent className="p-4 space-y-1">
                <div
                  className="text-xs text-muted-foreground"
                  title="Media do progresso geral considerando usuarios com e sem atividade."
                >
                  Progresso medio global
                </div>
                <div className="text-2xl font-semibold">{overviewStats.avgProgress}%</div>
              </CardContent>
            </Card>
            <Card className="border border-brand-border shadow-none">
              <CardContent className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground" title="Media das notas dos quizzes no escopo atual.">
                  Media quiz
                </div>
                <div className="text-2xl font-semibold">{overviewStats.avgQuizScore}%</div>
              </CardContent>
            </Card>
            <Card className="border border-brand-border shadow-none">
              <CardContent className="p-4 space-y-1">
                <div
                  className="text-xs text-muted-foreground"
                  title="Usuarios com baixa evolucao e sem atividade recente."
                >
                  Usuarios em risco alto
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold">{overviewStats.highRisk}</span>
                  <Badge variant="destructive" className="text-[11px]">
                    Alta prioridade
                  </Badge>
                </div>
                {overviewStats.mediumRisk > 0 && (
                  <div className="text-[11px] text-muted-foreground">{overviewStats.mediumRisk} em risco medio</div>
                )}
              </CardContent>
            </Card>
          </div>
          {loading && <div className="text-sm text-muted-foreground">Carregando insights...</div>}
          {error && <div className="text-sm text-red-400">{error}</div>}
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Tabs defaultValue="companies">
            <TabsList className="flex flex-wrap gap-2">
              <TabsTrigger value="companies">Empresas</TabsTrigger>
              <TabsTrigger value="profiles">Perfis de Parceiro</TabsTrigger>
              <TabsTrigger value="users">Usuarios</TabsTrigger>
            </TabsList>
            <TabsContent value="companies" className="mt-4">
              <CompanyProgressGrid rows={companies} />
            </TabsContent>
            <TabsContent value="profiles" className="mt-4">
              <PartnerProfileProgressGrid rows={profiles} />
            </TabsContent>
            <TabsContent value="users" className="mt-4">
              <UserProgressGrid rows={users} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="learning-paths" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <Card className="border border-brand-border shadow-none">
              <CardContent className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground" title="Quantidade de trilhas ativas no escopo atual.">
                  Trilhas ativas
                </div>
                <div className="text-2xl font-semibold">{overviewStats.activePaths}</div>
              </CardContent>
            </Card>
            <Card className="border border-brand-border shadow-none">
              <CardContent className="p-4 space-y-1">
                <div
                  className="text-xs text-muted-foreground"
                  title="Media das taxas de conclusao das trilhas (usuarios com progresso >= 90%)."
                >
                  Taxa media de conclusao
                </div>
                <div className="text-2xl font-semibold">{overviewStats.avgCompletion}%</div>
              </CardContent>
            </Card>
            <Card className="border border-brand-border shadow-none">
              <CardContent className="p-4 space-y-1">
                <div
                  className="text-xs text-muted-foreground"
                  title="Media em dias entre primeira atividade e conclusao da trilha."
                >
                  Tempo medio para completar
                </div>
                <div className="text-2xl font-semibold">
                  {overviewStats.avgTime ?? "-"}
                  {overviewStats.avgTime !== null ? <span className="ml-1 text-xs text-muted-foreground">dias</span> : null}
                </div>
              </CardContent>
            </Card>
            <Card className="border border-brand-border shadow-none">
              <CardContent className="p-4 space-y-1">
                <div
                  className="text-xs text-muted-foreground"
                  title="Media do progresso geral considerando usuarios com e sem atividade."
                >
                  Progresso medio global
                </div>
                <div className="text-2xl font-semibold">{overviewStats.avgProgress}%</div>
              </CardContent>
            </Card>
          </div>
          {loading && <div className="text-sm text-muted-foreground">Carregando insights...</div>}
          {error && <div className="text-sm text-red-400">{error}</div>}
          {!loading && !error && <LearningPathInsightsGrid insights={learningPathInsights} />}
        </TabsContent>

        <TabsContent value="quizzes" className="mt-4 space-y-4">
          {loading && <div className="text-sm text-muted-foreground">Carregando insights...</div>}
          {error && <div className="text-sm text-red-400">{error}</div>}
          {!loading && !error && <QuizInsightsGrid insights={quizInsights} />}
        </TabsContent>

        <TabsContent value="risk" className="mt-4 space-y-4">
          {loading && <div className="text-sm text-muted-foreground">Carregando insights...</div>}
          {error && <div className="text-sm text-red-400">{error}</div>}
          {!loading && !error && <UserRiskGrid insights={userRiskInsights} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
