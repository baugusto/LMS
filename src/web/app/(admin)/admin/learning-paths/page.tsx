"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/web/components/ui/button"
import { Card, CardContent } from "@/web/components/ui/card"
import { Badge } from "@/web/components/ui/badge"
import { DashboardLayout } from "@/web/components/layout/DashboardLayout"
import { Pencil, Trash2, BookOpen, Plus, CheckCircle2, XCircle } from "lucide-react"

type LearningPath = {
  id: string
  title: string
  partnerProfile?: { id: string; name: string }
  active: boolean
  order: number
}

export default function LearningPathsListPage() {
  const router = useRouter()
  const [data, setData] = useState<LearningPath[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/lms/learning-paths", { credentials: "include" })
        if (!res.ok) throw new Error("Erro ao carregar trilhas")
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error(err)
        setError("Erro ao carregar trilhas.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Tem certeza que deseja excluir esta trilha?")
    if (!confirmed) return
    try {
      setDeletingId(id)
      const res = await fetch(`/api/lms/learning-paths/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error("Erro ao excluir")
      setData((prev) => prev.filter((lp) => lp.id !== id))
    } catch (err) {
      console.error(err)
      alert("Erro ao excluir trilha.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <DashboardLayout active="admin-trilhas" isAdmin>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Trilhas de Conhecimento</h1>
            <p className="text-sm text-muted-foreground">Gerencie as trilhas disponíveis para parceiros</p>
          </div>
        </div>
        <Button onClick={() => router.push("/admin/learning-paths/new")} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Nova Trilha
        </Button>
      </div>

      {/* Table Card */}
      <Card className="glass-card border-border/50">
        <CardContent className="p-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Carregando...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-5">
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            </div>
          )}
          
          {!loading && !error && (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted-foreground border-b border-border/50 bg-muted/30">
                    <th className="py-4 px-5">Título</th>
                    <th className="py-4 px-5">Perfil</th>
                    <th className="py-4 px-5">Status</th>
                    <th className="py-4 px-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {data.map((lp) => (
                    <tr key={lp.id} className="hover:bg-blue-500/5 transition-colors group">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-blue-400" />
                          </div>
                          <span className="font-medium text-foreground group-hover:text-blue-400 transition-colors">
                            {lp.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        {lp.partnerProfile?.name ? (
                          <Badge variant="outline" className="text-xs">
                            {lp.partnerProfile.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        {lp.active ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="w-3 h-3" />
                            Inativa
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => router.push(`/admin/learning-paths/${lp.id}`)}
                            title="Editar"
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 w-8 p-0"
                            disabled={deletingId === lp.id}
                            onClick={() => handleDelete(lp.id)}
                            title="Excluir"
                            aria-label="Excluir"
                          >
                            {deletingId === lp.id ? (
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <BookOpen className="w-12 h-12 opacity-50" />
                          <p>Nenhuma trilha cadastrada.</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push("/admin/learning-paths/new")}
                            className="gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Criar primeira trilha
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
