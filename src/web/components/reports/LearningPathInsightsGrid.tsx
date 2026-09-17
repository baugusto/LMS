"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/web/components/ui/card"
import { Progress } from "@/web/components/ui/progress"
import { Badge } from "@/web/components/ui/badge"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { LearningPathInsight } from "@/server/lms/services/reports.insights.service"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Props = {
  insights: LearningPathInsight[]
}

const formatWeekLabel = (value: string) => value.slice(5)

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-brand-border bg-background/95 p-2 text-xs shadow-md">
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="font-medium text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildInsightsText(series: LearningPathInsight["weeklyProgressSeries"]) {
  if (series.length < 2) return []
  const first = series[0]?.avgProgress ?? 0
  const last = series[series.length - 1]?.avgProgress ?? 0
  const delta = last - first
  const direction = delta >= 0 ? "aumento" : "queda"
  const deltaText = `Houve ${direction} de ${Math.abs(delta)} p.p. no progresso medio nas ultimas semanas.`

  const topWeek = series.reduce(
    (acc, curr) => (curr.completedUsers > acc.completedUsers ? curr : acc),
    { completedUsers: 0, weekStart: "" } as LearningPathInsight["weeklyProgressSeries"][number],
  )
  const topText =
    topWeek.completedUsers > 0
      ? `O pico de conclusoes ocorreu na semana ${formatWeekLabel(topWeek.weekStart)}.`
      : "Ainda nao ha conclusoes registradas."

  return [deltaText, topText]
}

export function LearningPathInsightsGrid({ insights }: Props) {
  const [open, setOpen] = useState<string | null>(null)

  const rows = useMemo(() => [...insights].sort((a, b) => a.learningPathTitle.localeCompare(b.learningPathTitle)), [insights])

  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground">Nenhum insight encontrado para os filtros atuais.</div>
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="min-w-[980px] space-y-2">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_90px] text-xs text-muted-foreground px-2">
            <span>Trilha</span>
            <span>Empresa / Perfil</span>
            <span title="Media do progresso dos usuarios que iniciaram a trilha.">Progresso medio</span>
            <span title="Percentual de usuarios com progresso >= 90%.">Taxa de conclusao</span>
            <span title="Formato: iniciaram / concluiram / total de usuarios.">Usuarios</span>
            <span title="Media em dias para concluir a trilha.">Tempo medio</span>
            <span>Acoes</span>
          </div>
          <div className="space-y-2">
            {rows.map((row) => {
              const isOpen = open === row.learningPathId
              const scope = [row.companyName, row.partnerProfileName].filter(Boolean).join(" · ") || "-"
              const insightsText = buildInsightsText(row.weeklyProgressSeries)

              return (
                <Card key={row.learningPathId} className="shadow-none border border-brand-border">
                  <CardContent className="p-3 space-y-2">
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_90px] items-center gap-2">
                      <div className="text-sm font-semibold">{row.learningPathTitle}</div>
                      <div className="text-sm">{scope}</div>
                      <div className="flex items-center gap-2">
                        <Progress value={row.avgProgress} />
                        <span className="text-sm font-medium">{row.avgProgress}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={row.completionRate} />
                        <span className="text-sm font-medium">{row.completionRate}%</span>
                      </div>
                      <div className="text-sm">
                        <Badge variant="outline" className="text-[11px]">
                          {row.startedUsers}/{row.completedUsers}/{row.totalUsers}
                        </Badge>
                      </div>
                      <div className="text-sm">{row.avgTimeToCompleteDays ?? "-"}</div>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-sm text-blue-400"
                        onClick={() => setOpen(isOpen ? null : row.learningPathId)}
                      >
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        Detalhe
                      </button>
                    </div>
                    {isOpen && (
                      <div className="rounded-lg border border-dashed border-brand-border p-3 space-y-4 bg-muted/30">
                        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={row.weeklyProgressSeries}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                                <XAxis dataKey="weekStart" tickFormatter={formatWeekLabel} stroke="#94a3b8" fontSize={11} />
                                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} />
                                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} />
                                <Tooltip content={<ChartTooltip />} />
                                <Legend />
                                <Bar yAxisId="right" dataKey="startedUsers" name="Inicios" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                                <Bar
                                  yAxisId="right"
                                  dataKey="completedUsers"
                                  name="Concluidos"
                                  fill="#22c55e"
                                  radius={[4, 4, 0, 0]}
                                />
                                <Line
                                  yAxisId="left"
                                  type="monotone"
                                  dataKey="avgProgress"
                                  name="Progresso medio"
                                  stroke="#6366f1"
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span
                                className="text-muted-foreground"
                                title="Media em dias entre a primeira atividade e a conclusao."
                              >
                                Tempo medio (dias)
                              </span>
                              <span className="font-semibold">{row.avgTimeToCompleteDays ?? "-"}</span>
                            </div>
                            <div className="space-y-2">
                              {insightsText.map((text) => (
                                <div key={text} className="rounded-lg border border-brand-border bg-background/80 p-2 text-sm">
                                  {text}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
