"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/web/components/ui/card"
import { Badge } from "@/web/components/ui/badge"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { QuizInsight, QuestionInsight } from "@/server/lms/services/reports.insights.service"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type Props = {
  insights: QuizInsight[]
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-brand-border bg-background/95 p-2 text-xs shadow-md">
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-medium text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function QuestionList({ title, questions }: { title: string; questions: QuestionInsight[] }) {
  if (questions.length === 0) {
    return <div className="text-sm text-muted-foreground">Sem dados suficientes.</div>
  }
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{title}</div>
      {questions.map((q) => {
        const accuracy = q.accuracyPercent
        const variant = accuracy < 40 ? "destructive" : accuracy > 85 ? "success" : "warning"
        return (
          <div key={q.questionId} className="flex items-start justify-between gap-3 rounded-lg border border-brand-border bg-background/70 p-2">
            <div className="flex-1">
              <div className="text-sm font-medium truncate" title={q.prompt}>
                {q.prompt}
              </div>
              <div className="text-[11px] text-muted-foreground">{q.attempts} tentativas</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={variant} className="text-[11px]">
                {accuracy < 40 ? "Dificil" : accuracy > 85 ? "Facil" : "Atenção"}
              </Badge>
              <span className="text-xs font-semibold">{accuracy}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function QuizInsightsGrid({ insights }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const rows = useMemo(() => [...insights].sort((a, b) => a.learningPathTitle.localeCompare(b.learningPathTitle)), [insights])

  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground">Nenhum quiz encontrado para os filtros atuais.</div>
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="min-w-[940px] space-y-2">
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_90px] text-xs text-muted-foreground px-2">
            <span>Trilha</span>
            <span>Quiz</span>
            <span title="Media das notas das tentativas.">Media</span>
            <span title="Percentual de tentativas com nota >= 70%.">Aprovacao</span>
            <span title="Total de tentativas registradas.">Tentativas</span>
            <span>Acoes</span>
          </div>
          <div className="space-y-2">
            {rows.map((row) => {
              const isOpen = open === row.quizId
              return (
                <Card key={row.quizId} className="shadow-none border border-brand-border">
                  <CardContent className="p-3 space-y-2">
                    <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_90px] items-center gap-2">
                      <div className="text-sm font-semibold">{row.learningPathTitle}</div>
                      <div className="text-sm">{row.quizTitle}</div>
                      <div className="text-sm font-medium">{row.avgScorePercent}%</div>
                      <div className="text-sm font-medium">{row.passRate}%</div>
                      <div className="text-sm">{row.attemptsCount}</div>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-sm text-blue-400"
                        onClick={() => setOpen(isOpen ? null : row.quizId)}
                      >
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        Detalhe
                      </button>
                    </div>
                    {isOpen && (
                      <div className="rounded-lg border border-dashed border-brand-border p-3 space-y-4 bg-muted/30">
                        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
                          <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={row.scoreBuckets}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                                <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} />
                                <YAxis stroke="#94a3b8" fontSize={11} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="count" name="Tentativas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            <QuestionList title="Perguntas mais dificeis" questions={row.hardestQuestions} />
                            <QuestionList title="Perguntas mais faceis" questions={row.easiestQuestions} />
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
