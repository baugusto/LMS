"use client"

import { useState, type MouseEvent } from "react"
import { Progress } from "../ui/progress"
import { CheckCircle2, Clock, Circle, RotateCcw } from "lucide-react"

export type LearningRowProps = {
  iconLabel: string
  name: string
  lessons: string
  profile: string
  progress: number
  status: string
  trackId: string
  href?: string
}

export function MyTrackRow({ iconLabel, name, lessons, profile, progress, status, trackId, href }: LearningRowProps) {
  const maxNameChars = 32
  const truncatedName = name.length > maxNameChars ? `${name.slice(0, maxNameChars).trimEnd()}...` : name
  const [resetting, setResetting] = useState(false)

  const statusConfig = (() => {
    if (status === "COMPLETED" || status === "Finalizado") {
      return {
        label: "Finalizado",
        icon: <CheckCircle2 className="w-4 h-4" />,
        className: "text-green-400 bg-green-500/10 border-green-500/20"
      }
    }
    if (status === "IN_PROGRESS" || status === "Em Progresso") {
      return {
        label: "Em Progresso",
        icon: <Clock className="w-4 h-4" />,
        className: "text-blue-400 bg-blue-500/10 border-blue-500/20"
      }
    }
    return {
      label: "Não Iniciado",
      icon: <Circle className="w-4 h-4" />,
      className: "text-muted-foreground bg-muted/50 border-border/50"
    }
  })()

  const handleReset = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (resetting) return
    const confirmed = window.confirm("Deseja reiniciar esta trilha? Isso vai limpar todo o seu progresso.")
    if (!confirmed) return
    try {
      setResetting(true)
      const res = await fetch(`/api/tracks/${trackId}/reset`, { method: "POST", credentials: "include" })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || "Erro ao reiniciar trilha")
      }
      window.location.reload()
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : "Erro ao reiniciar trilha"
      window.alert(message)
    } finally {
      setResetting(false)
    }
  }

  const content = (
    <div className="grid grid-cols-[1.8fr_0.9fr_0.9fr_0.9fr_0.25fr] items-center px-5 py-4 gap-3 hover:bg-blue-500/5 transition-colors group">
      {/* Track Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center text-xs font-semibold text-blue-400 group-hover:border-blue-500/40 transition-colors">
          {iconLabel}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-foreground truncate block w-full group-hover:text-blue-400 transition-colors" title={name}>
            {truncatedName}
          </span>
          <span className="text-xs text-muted-foreground">{lessons}</span>
        </div>
      </div>
      
      {/* Profile */}
      <div className="text-sm text-muted-foreground">{profile}</div>
      
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Progress value={progress} className="h-2" />
        </div>
        <span className="text-sm font-medium text-foreground min-w-[48px]">{progress}%</span>
      </div>
      
      {/* Status */}
      <div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${statusConfig.className}`}>
          {statusConfig.icon}
          {statusConfig.label}
        </span>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/10 transition disabled:opacity-50"
          title="Reiniciar trilha"
          aria-label="Reiniciar trilha"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  if (href) {
    return (
      <a
        href={href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
      >
        {content}
      </a>
    )
  }

  return content
}
