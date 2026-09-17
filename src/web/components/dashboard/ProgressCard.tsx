import { ChevronRight, Trophy, Target } from "lucide-react"
import { Badge } from "../ui/badge"
import { Progress } from "../ui/progress"

export function ProgressHighlight({
  percent,
  title,
  completed,
  total,
  href,
}: {
  percent: number
  title: string
  completed: number
  total: number
  href?: string
}) {
  const isComplete = percent >= 100

  const content = (
    <div className="rounded-xl bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-transparent p-4 space-y-3 border border-blue-500/20 relative overflow-hidden group hover:border-blue-500/40 transition-colors">
      {/* Decorative glow */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-colors" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isComplete ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
            {isComplete ? (
              <Trophy className="w-4 h-4 text-green-400" />
            ) : (
              <Target className="w-4 h-4 text-blue-400" />
            )}
          </div>
          <Badge className={`text-xs font-semibold ${isComplete ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
            {percent}%
          </Badge>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
      </div>
      
      <div className="relative z-10">
        <div className="font-semibold text-foreground text-sm mb-1">{title}</div>
        <div className="text-xs text-muted-foreground">
          {completed} de {total} recursos concluídos
        </div>
      </div>
      
      <Progress value={percent} className="h-2 relative z-10" />
    </div>
  )

  if (href) {
    return (
      <a
        href={href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
      >
        {content}
      </a>
    )
  }

  return content
}

export function ProgressMiniCard({
  percent,
  title,
  text,
  href,
}: {
  percent: number
  title: string
  text: string
  href?: string
}) {
  const isComplete = percent >= 100

  const content = (
    <div className="rounded-xl border border-border/50 p-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 hover:border-blue-500/30 transition-all group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge className={`text-xs font-medium ${isComplete ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
            {percent}%
          </Badge>
        </div>
        <div className="text-sm font-medium text-foreground truncate">{title}</div>
        <div className="text-xs text-muted-foreground">{text}</div>
      </div>
      <div className="w-9 h-9 rounded-lg border border-border/50 flex items-center justify-center bg-muted/50 group-hover:border-blue-500/30 group-hover:bg-blue-500/10 transition-all ml-3">
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
      </div>
    </div>
  )

  if (href) {
    return (
      <a
        href={href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
      >
        {content}
      </a>
    )
  }

  return content
}
