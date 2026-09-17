"use client"

import { useState } from "react"
import { Card, CardContent } from "@/web/components/ui/card"
import { Progress } from "@/web/components/ui/progress"
import { Badge } from "@/web/components/ui/badge"
import { ChevronDown, ChevronRight } from "lucide-react"
import { PartnerProfileProgressRow } from "@/server/lms/services/reports.service"

export function PartnerProfileProgressGrid({ rows }: { rows: PartnerProfileProgressRow[] }) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="min-w-[720px] space-y-2">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] text-xs text-muted-foreground px-2">
            <span>Perfil</span>
            <span title="Quantidade de empresas vinculadas ao perfil.">Empresas</span>
            <span title="Total de usuários vinculados ao perfil.">Usuários</span>
            <span title="Média de progresso dos usuários (0% para quem não iniciou).">Progresso médio</span>
            <span>Ações</span>
          </div>
          <div className="space-y-2">
            {rows.map((row) => {
              const isOpen = open === row.partnerProfileId
              return (
                <Card key={row.partnerProfileId} className="shadow-none border border-brand-border">
                  <CardContent className="p-3 space-y-2">
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{row.partnerProfileName}</span>
                      </div>
                      <div className="text-sm">{row.companiesCount}</div>
                      <div className="text-sm">{row.totalUsers}</div>
                      <div className="flex items-center gap-2">
                        <Progress value={row.avgPercent} />
                        <span className="text-sm font-medium">{row.avgPercent}%</span>
                      </div>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-sm text-blue-400"
                        onClick={() => setOpen(isOpen ? null : row.partnerProfileId)}
                      >
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        Detalhe
                      </button>
                    </div>
                    {isOpen && (
                      <div className="rounded-lg border border-dashed border-brand-border p-3 space-y-2 bg-muted/30">
                        <div className="grid grid-cols-[2fr_1fr_1fr] text-[12px] text-muted-foreground">
                          <span>Trilha</span>
                          <span title="Média de progresso na trilha.">Progresso</span>
                          <span title="Usuários concluídos / usuários que iniciaram.">Concluídos</span>
                        </div>
                        {row.tracks.map((t) => (
                          <div key={t.learningPathId} className="grid grid-cols-[2fr_1fr_1fr] items-center gap-2 text-sm">
                            <span>{t.learningPathTitle}</span>
                            <div className="flex items-center gap-2">
                              <Progress value={t.avgPercent} />
                              <span className="text-sm font-medium">{t.avgPercent}%</span>
                            </div>
                            <div className="text-sm">
                              <Badge variant="outline" className="text-[11px]">
                                {t.usersCompleted}/{t.totalUsers}
                              </Badge>
                            </div>
                          </div>
                        ))}
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
