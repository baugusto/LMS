"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/web/components/ui/badge"
import { Button } from "@/web/components/ui/button"
import { Input } from "@/web/components/ui/input"
import type { UserRiskInsight } from "@/server/lms/services/reports.insights.service"

type Props = {
  insights: UserRiskInsight[]
}

const riskVariant: Record<UserRiskInsight["riskLevel"], "destructive" | "warning" | "success"> = {
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "success",
}

const riskLabel: Record<UserRiskInsight["riskLevel"], string> = {
  HIGH: "ALTO",
  MEDIUM: "MEDIO",
  LOW: "BAIXO",
}

export function UserRiskGrid({ insights }: Props) {
  const [query, setQuery] = useState("")
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return insights
    const q = query.toLowerCase()
    return insights.filter((item) => item.userName.toLowerCase().includes(q) || item.email.toLowerCase().includes(q))
  }, [insights, query])

  const handleCopy = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email)
      setCopiedEmail(email)
      setTimeout(() => setCopiedEmail(null), 1500)
    } catch (err) {
      console.error("Falha ao copiar email", err)
    }
  }

  if (insights.length === 0) {
    return <div className="text-sm text-muted-foreground">Nenhum usuario em risco para os filtros atuais.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="w-full sm:w-72"
          placeholder="Buscar usuario ou email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="text-xs text-muted-foreground sm:text-right">{filtered.length} usuarios</div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[1180px] space-y-2">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_120px] text-xs text-muted-foreground px-2">
            <span>Usuario</span>
            <span>Empresa</span>
            <span>Perfil</span>
            <span>Trilha</span>
            <span title="Media de progresso na trilha selecionada.">Progresso</span>
            <span title="Media das notas dos quizzes respondidos pelo usuario.">Quiz</span>
            <span title="Ultima interacao registrada em video ou quiz.">Ultima atividade</span>
            <span title="Classificacao baseada em progresso e inatividade.">Nivel de risco</span>
            <span>Acoes</span>
          </div>
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="px-2 text-sm text-muted-foreground">Nenhum usuario encontrado.</div>
            ) : (
              filtered.map((row) => {
                const lastActivity = new Date(row.lastActivityAt)
                const viewUrl = `/admin/learning-paths/${row.learningPathId}?userId=${row.userId}`
                return (
                  <div key={`${row.userId}-${row.learningPathId}`} className="rounded-lg border border-brand-border bg-background/60 p-3">
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_120px] items-center gap-2 text-sm">
                      <div>
                        <div className="font-semibold">{row.userName}</div>
                        <div className="text-[11px] text-muted-foreground">{row.email}</div>
                      </div>
                      <div>{row.companyName ?? "-"}</div>
                      <div>{row.partnerProfileName ?? "-"}</div>
                      <div className="text-sm">{row.learningPathTitle}</div>
                      <div className="font-medium">{row.avgProgress}%</div>
                      <div>{row.quizAvgPercent === null || row.quizAvgPercent === undefined ? "-" : `${row.quizAvgPercent}%`}</div>
                      <div className="text-[12px] text-muted-foreground">{lastActivity.toLocaleDateString("pt-BR")}</div>
                      <div>
                        <Badge variant={riskVariant[row.riskLevel]} className="text-[11px]">
                          {riskLabel[row.riskLevel]}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={viewUrl}>Ver detalhes</Link>
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleCopy(row.email)}>
                          {copiedEmail === row.email ? "Copiado" : "Copiar email"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
