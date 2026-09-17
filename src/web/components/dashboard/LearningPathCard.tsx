import { ChevronRight, Play } from "lucide-react"
import { Badge } from "../ui/badge"

export function LearningPathCard({
  variant,
  title,
  href,
  modules,
  badges,
}: {
  variant: "blue" | "purple" | "cyan"
  title: string
  href?: string
  modules: string
  badges: string[]
}) {
  const gradients = {
    blue: "from-blue-500/20 via-blue-600/10 to-transparent",
    purple: "from-purple-500/20 via-purple-600/10 to-transparent",
    cyan: "from-cyan-500/20 via-cyan-600/10 to-transparent",
  }

  const accents = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    cyan: "bg-cyan-500",
  }

  const glows = {
    blue: "shadow-[0_0_20px_rgba(59,130,246,0.3)]",
    purple: "shadow-[0_0_20px_rgba(168,85,247,0.3)]",
    cyan: "shadow-[0_0_20px_rgba(6,182,212,0.3)]",
  }

  const maxTitleChars = 24
  const truncatedTitle = title.length > maxTitleChars ? `${title.slice(0, maxTitleChars).trimEnd()}...` : title

  const content = (
    <div className={`glass-card rounded-2xl h-[160px] p-5 relative overflow-hidden group hover-card`}>
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradients[variant]} opacity-50`} />
      
      {/* Decorative blob */}
      <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${accents[variant]} opacity-20 blur-2xl group-hover:opacity-30 transition-opacity`} />
      
      {/* Play button */}
      <div className="absolute right-4 top-4">
        <div className={`w-10 h-10 rounded-xl ${accents[variant]} flex items-center justify-center ${glows[variant]} group-hover:scale-110 transition-transform`}>
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end">
        <div className="font-semibold text-foreground text-base mb-1 truncate" title={title}>
          {truncatedTitle}
        </div>
        <div className="text-sm text-muted-foreground mb-3">{modules}</div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {badges.filter(Boolean).map((b) => (
              <Badge key={b} className="text-xs bg-muted/50 text-foreground border-border/50 hover:bg-muted/70">
                {b}
              </Badge>
            ))}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <a 
        href={href} 
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl"
      >
        {content}
      </a>
    )
  }

  return content
}
