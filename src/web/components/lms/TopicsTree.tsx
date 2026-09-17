"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/web/components/ui/card"
import { Button } from "@/web/components/ui/button"
import { Badge } from "@/web/components/ui/badge"
import { cn } from "@/web/lib/utils"
import { Edit3, FilePlus, FileText, Image, Link2, ListTree, Trash2, Video, FileSpreadsheet, FileType, Plus, HelpCircle } from "lucide-react"

type ResourceType = "VIDEO" | "PDF" | "SLIDE" | "DOC" | "SHEET" | "IMAGE" | "LINK" | "QUIZ"
type Resource = {
  id: string
  type: ResourceType
  title: string
  description?: string
  url: string
  durationMinutes?: number | null
  order: number
}

type Topic = {
  id: string
  title: string
  description?: string
  order: number
  resources: Resource[]
}

export type TopicsTreeProps = {
  topics: Topic[]
  selectedTopicId: string | null
  selectedResourceId: string | null
  onSelectTopic: (topicId: string) => void
  onSelectResource: (topicId: string, resourceId: string) => void
  onEditTopic: (topicId: string) => void
  onEditResource: (topicId: string, resourceId: string) => void
  onDeleteTopic: (topicId: string) => void
  onDeleteResource: (topicId: string, resourceId: string) => void
  onNewTopic: () => void
  onNewResource: (topicId: string) => void
}

const resourceIcon = (type: ResourceType) => {
  switch (type) {
    case "VIDEO":
      return <Video className="w-4 h-4 text-blue-400" />
    case "PDF":
      return <FileType className="w-4 h-4 text-red-400" />
    case "SLIDE":
      return <FileText className="w-4 h-4 text-orange-400" />
    case "DOC":
      return <FileText className="w-4 h-4 text-blue-400" />
    case "SHEET":
      return <FileSpreadsheet className="w-4 h-4 text-green-400" />
    case "IMAGE":
      return <Image className="w-4 h-4 text-purple-400" />
    case "LINK":
      return <Link2 className="w-4 h-4 text-cyan-400" />
    case "QUIZ":
      return <HelpCircle className="w-4 h-4 text-amber-400" />
    default:
      return <FileText className="w-4 h-4 text-muted-foreground" />
  }
}

export function TopicsTree({
  topics,
  selectedTopicId,
  selectedResourceId,
  onSelectTopic,
  onSelectResource,
  onEditTopic,
  onEditResource,
  onDeleteTopic,
  onDeleteResource,
  onNewTopic,
  onNewResource,
}: TopicsTreeProps) {
  return (
    <Card className="h-full glass-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <ListTree className="w-4 h-4 text-blue-400" />
          </div>
          Estrutura da trilha
        </CardTitle>
        <Button type="button" variant="secondary" size="sm" onClick={onNewTopic} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Novo tópico
        </Button>
      </CardHeader>
      <CardContent>
        <div className="max-h-[720px] pr-2 overflow-y-auto space-y-3">
          {topics.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ListTree className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum tópico cadastrado.</p>
            </div>
          )}
          {topics.map((topic, idx) => (
            <div
              key={topic.id}
              className={cn(
                "rounded-xl border p-4 space-y-3 transition-all",
                selectedTopicId === topic.id 
                  ? "border-blue-500/50 bg-blue-500/10" 
                  : "border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-border",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="text-left flex-1"
                  onClick={() => onSelectTopic(topic.id)}
                  title="Selecionar tópico"
                >
                  <div className="text-sm font-semibold text-foreground">
                    {idx + 1}. {topic.title || "Tópico sem título"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Ordem: {topic.order ?? idx}</div>
                </button>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => onEditTopic(topic.id)} title="Editar tópico" className="h-8 w-8">
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => onNewResource(topic.id)} title="Novo recurso" className="h-8 w-8">
                    <FilePlus className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => onDeleteTopic(topic.id)} title="Excluir tópico" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 pl-2">
                {topic.resources.length === 0 && <p className="text-xs text-muted-foreground py-2">Nenhum recurso.</p>}
                {[...topic.resources].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((res) => (
                  <div
                    key={res.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 border border-dashed transition-all",
                      selectedResourceId === res.id 
                        ? "border-blue-500/50 bg-blue-500/10" 
                        : "border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-border",
                    )}
                  >
                    <button
                      type="button"
                      className="flex items-center gap-2.5 text-left"
                      onClick={() => onSelectResource(topic.id, res.id)}
                      title="Selecionar recurso"
                    >
                      {resourceIcon(res.type as ResourceType)}
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{res.title || "Recurso"}</span>
                        <span className="text-xs text-muted-foreground">{res.type}</span>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        Ordem {res.order ?? 0}
                      </Badge>
                      <Button type="button" variant="ghost" size="icon" onClick={() => onEditResource(topic.id, res.id)} title="Editar recurso" className="h-7 w-7">
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => onDeleteResource(topic.id, res.id)} title="Excluir recurso" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
