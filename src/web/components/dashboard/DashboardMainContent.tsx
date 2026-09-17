"use client"

import { useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/web/components/ui/card"
import { LearningPathCard } from "@/web/components/dashboard/LearningPathCard"
import { MyTrackRow } from "@/web/components/dashboard/MyTrackRow"
import { Search, X } from "lucide-react"

type LearningPath = {
  id: string
  title: string
  description?: string | null
  partnerProfile?: { name?: string | null } | null
  resourcesTotal?: number | null
  progressPercent?: number | null
  resourcesCompleted?: number | null
  status?: string | null
}

type Props = {
  userFirstName?: string | null
  recentLearningPaths: LearningPath[]
  myLearningPaths: LearningPath[]
}

export function DashboardMainContent({ userFirstName, recentLearningPaths, myLearningPaths }: Props) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const normalizedQuery = query.trim().toLowerCase()

  const matchesQuery = (lp: LearningPath) => {
    if (!normalizedQuery) return true
    const haystack = [lp.title ?? "", lp.description ?? "", lp.partnerProfile?.name ?? ""].join(" ").toLowerCase()
    return haystack.includes(normalizedQuery)
  }

  const filteredRecent = useMemo(
    () => (normalizedQuery ? recentLearningPaths.filter(matchesQuery) : recentLearningPaths),
    [normalizedQuery, recentLearningPaths],
  )
  const filteredMyLearningPaths = useMemo(
    () => (normalizedQuery ? myLearningPaths.filter(matchesQuery) : myLearningPaths),
    [normalizedQuery, myLearningPaths],
  )

  return (
    <>
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Bem-vindo de volta, {userFirstName ?? "Usuário"}</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-2.5 w-full sm:min-w-[280px] sm:w-auto border border-border/50 focus-within:border-blue-500/50 transition-colors">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-6 flex-1 border-0 bg-transparent px-0 text-sm placeholder:text-muted-foreground outline-none shadow-none appearance-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0"
              placeholder="Buscar trilhas, tópicos ou materiais…"
              aria-label="Buscar trilhas, tópicos ou materiais"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  inputRef.current?.focus()
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Recent Learning Paths */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Trilhas Recentes</h2>
        </div>
        {filteredRecent.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma trilha recente encontrada.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRecent.map((lp, idx) => (
              <LearningPathCard
                key={lp.id}
                variant={["blue", "purple", "cyan"][idx % 3] as any}
                href={`/tracks/${lp.id}`}
                title={lp.title}
                modules={`${lp.resourcesTotal ?? 0} recursos`}
                badges={[lp.partnerProfile?.name ?? ""]}
              />
            ))}
          </div>
        )}
      </section>

      {/* My Learning Paths */}
      <section className="space-y-4 mt-2 flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Minhas Trilhas</h2>
        </div>
        <Card className="glass-card border-border/50 rounded-2xl flex flex-col flex-1 min-h-0">
          <CardContent className="p-0 flex flex-col flex-1 min-h-0">
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                {/* Table Header */}
                <div className="grid grid-cols-[1.8fr_0.9fr_0.9fr_0.9fr_0.25fr] text-xs font-medium text-muted-foreground px-5 py-3 border-b border-border/50 bg-muted/30 rounded-t-2xl">
                  <span>Nome da trilha</span>
                  <span>Perfil</span>
                  <span>Progresso</span>
                  <span>Status</span>
                  <span className="text-right">Ações</span>
                </div>
                {/* Table Body */}
                <div className="divide-y divide-border/30 flex-1 overflow-auto">
                  {filteredMyLearningPaths.length === 0 ? (
                    <div className="px-5 py-6 text-sm text-muted-foreground">Nenhuma trilha encontrada.</div>
                  ) : (
                    filteredMyLearningPaths.map((lp) => (
                      <MyTrackRow
                        key={lp.id}
                        trackId={lp.id}
                        href={`/tracks/${lp.id}`}
                        iconLabel={(lp.partnerProfile?.name ?? "").slice(0, 3).toUpperCase()}
                        name={lp.title}
                        profile={lp.partnerProfile?.name ?? "-"}
                        progress={lp.progressPercent ?? 0}
                        status={lp.status ?? "Não Iniciado"}
                        lessons={`${lp.resourcesCompleted ?? 0} de ${lp.resourcesTotal ?? 0} recursos`}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  )
}
