"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/web/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/web/components/ui/card"
import { Input } from "@/web/components/ui/input"
import { DashboardLayout } from "@/web/components/layout/DashboardLayout"
import { RichTextEditor } from "@/web/components/lms/RichTextEditor"
import { QuizBuilder, type QuizDefinition } from "@/web/components/lms/QuizBuilder"

type PartnerProfile = { id: string; name: string; active: boolean }
type TopicInput = { id: string; title: string; description: string; order: number; resources: ResourceInput[] }
type ResourceInput = { id: string; type: string; title: string; description: string; url: string; durationMinutes?: number | null; quiz?: QuizDefinition }

const uploadableResourceTypes = new Set(["DOC", "PDF", "SLIDE", "SHEET", "IMAGE"])
const uploadAcceptByType: Record<string, string> = {
  DOC: ".pdf,.doc,.docx",
  PDF: ".pdf",
  SLIDE: ".ppt,.pptx,.pdf",
  SHEET: ".xls,.xlsx,.csv",
  IMAGE: "image/*",
}

const isTemporaryUploadUrl = (url: string) => url.startsWith("blob:") || url.startsWith("data:")

export default function NewLearningPathPage() {
  const router = useRouter()
  const tResources = useTranslations("resources")
  const newResourceFileInputRef = useRef<HTMLInputElement | null>(null)
  const [profiles, setProfiles] = useState<PartnerProfile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    title: "",
    description: "",
    partnerProfileIds: [] as string[],
    order: 0,
    active: true,
    topics: [] as TopicInput[],
  })
  const [newTopic, setNewTopic] = useState<TopicInput>({ id: crypto.randomUUID(), title: "", description: "", order: 0, resources: [] })
  const [newResource, setNewResource] = useState<ResourceInput>({
    id: crypto.randomUUID(),
    type: "VIDEO",
    title: "",
    description: "",
    url: "",
    durationMinutes: null,
  })
  const [quizDrafts, setQuizDrafts] = useState<Record<string, QuizDefinition>>({})
  const [newResourceQuizError, setNewResourceQuizError] = useState("")
  const [newResourceIsExternal, setNewResourceIsExternal] = useState(true)
  const [newResourceFileName, setNewResourceFileName] = useState("")
  const [newResourceUploading, setNewResourceUploading] = useState(false)
  const [newResourceUploadError, setNewResourceUploadError] = useState("")
  const isQuizResource = newResource.type === "QUIZ"
  const newResourceNeedsUrl = !isQuizResource

  useEffect(() => {
    if (!uploadableResourceTypes.has(newResource.type)) {
      setNewResourceIsExternal(true)
      setNewResourceFileName("")
      setNewResourceUploadError("")
      setNewResourceUploading(false)
      setNewResourceQuizError("")
      if (newResourceFileInputRef.current) {
        newResourceFileInputRef.current.value = ""
      }
      setNewResource((prev) => (isTemporaryUploadUrl(prev.url) ? { ...prev, url: "" } : prev))
      return
    }
    setNewResourceFileName("")
    setNewResourceUploadError("")
    setNewResourceUploading(false)
    setNewResourceQuizError("")
    if (newResourceFileInputRef.current) {
      newResourceFileInputRef.current.value = ""
    }
  }, [newResource.type])

  useEffect(() => {
    if (newResource.type !== "QUIZ") return
    if (quizDrafts[newResource.id]) return
    setQuizDrafts((prev) => ({ ...prev, [newResource.id]: { title: newResource.title, questions: [] } }))
  }, [newResource.type, newResource.id, newResource.title, quizDrafts])

  const uploadResourceFile = async (file: File, type: string) => {
    const formData = new FormData()
    formData.append("type", type)
    formData.append("file", file)
    const res = await fetch("/api/lms/resources/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    })
    if (!res.ok) {
      let message = `Erro ao enviar arquivo (${res.status})`
      try {
        const payload = await res.json()
        if (payload?.error) message = payload.error
      } catch {
        const raw = await res.text().catch(() => "")
        if (raw) message = raw
      }
      throw new Error(message)
    }
    return res.json() as Promise<{ url: string; fileName?: string }>
  }

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setLoadingProfiles(true)
        const res = await fetch("/api/lms/partner-profiles", { credentials: "include" })
        if (!res.ok) throw new Error("Erro ao carregar perfis")
        const json = await res.json()
        setProfiles(Array.isArray(json) ? json.filter((p) => p.active) : [])
      } catch (err) {
        console.error(err)
        setError("Erro ao carregar perfis de parceria.")
      } finally {
        setLoadingProfiles(false)
      }
    }
    loadProfiles()
  }, [])

  const saveQuizzes = async (learningPathId: string, topicsToSave: TopicInput[]) => {
    const quizResources = topicsToSave.flatMap((t) => t.resources).filter((r) => r.type === "QUIZ")
    if (quizResources.length === 0) return

    for (const resource of quizResources) {
      const draft = quizDrafts[resource.id]
      if (!draft || draft.questions.length === 0) {
        throw new Error(`Quiz "${resource.title}" está sem perguntas.`)
      }
      const payload = {
        learningPathId,
        resourceId: resource.id,
        title: draft.title || resource.title,
        questions: draft.questions.map((q, idx) => ({
          id: q.id,
          prompt: q.prompt,
          type: q.type,
          correctTextAnswer: q.correctTextAnswer,
          order: idx,
          options: (q.options ?? []).map((o, oIdx) => ({
            id: o.id,
            text: o.text,
            isCorrect: o.isCorrect,
            order: oIdx,
          })),
        })),
      }
      const res = await fetch("/api/admin/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorPayload = await res.json().catch(() => ({}))
        throw new Error(errorPayload.error || "Erro ao salvar quiz")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || form.partnerProfileIds.length === 0) {
      setError("Preencha título e selecione ao menos um perfil.")
      return
    }
    const quizResources = form.topics.flatMap((t) => t.resources).filter((r) => r.type === "QUIZ")
    for (const resource of quizResources) {
      const draft = quizDrafts[resource.id]
      if (!draft || draft.questions.length === 0) {
        setError(`O quiz "${resource.title}" precisa ter ao menos uma pergunta.`)
        return
      }
    }
    const orderNumber = Number(form.order) || 0

    try {
      setSaving(true)
      setError("")
      const res = await fetch("/api/lms/learning-paths", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description ?? "",
          partnerProfileIds: form.partnerProfileIds,
          order: orderNumber < 0 ? 0 : orderNumber,
          active: form.active,
          topics: form.topics.map((t, idx) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            order: t.order ?? idx,
            resources: t.resources.map((r) => ({
              id: r.id,
              type: r.type,
              title: r.title,
              description: r.description,
              url: r.type === "QUIZ" ? "" : r.url,
              durationMinutes: r.durationMinutes,
            })),
          })),
        }),
      })
      if (!res.ok) throw new Error("Erro ao criar trilha")
      const payload = await res.json().catch(() => null)
      const learningPathId = payload?.id
      if (learningPathId) {
        await saveQuizzes(learningPathId, form.topics)
      }
      router.push("/admin/learning-paths")
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : "Erro ao criar trilha. Verifique os dados e tente novamente."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout active="admin-trilhas" isAdmin>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Nova Trilha</h1>
            <p className="text-sm text-muted-foreground">Cadastre uma nova trilha de conhecimento</p>
          </div>
          <Button variant="ghost" onClick={() => router.back()} className="w-full sm:w-auto">
            ← Voltar
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Dados da trilha</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>

              <RichTextEditor
                label="Descrição"
                value={form.description}
                onChange={(val) => setForm({ ...form, description: val })}
                placeholder="Descreva a trilha com formatação rica..."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Perfis de parceria</label>
                  {loadingProfiles ? (
                    <p className="text-sm text-muted-foreground">Carregando perfis de parceria...</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profiles.map((p) => {
                        const active = form.partnerProfileIds.includes(p.id)
                        return (
                          <button
                            type="button"
                            key={p.id}
                            className={`px-3 py-1 rounded-full text-sm border ${
                              active ? "bg-blue-500 text-white border-blue-500" : "border-brand-border text-foreground"
                            }`}
                            onClick={() =>
                              setForm({
                                ...form,
                                partnerProfileIds: active
                                  ? form.partnerProfileIds.filter((id) => id !== p.id)
                                  : [...form.partnerProfileIds, p.id],
                              })
                            }
                          >
                            {p.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ordem</label>
                  <Input type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Trilha ativa
              </label>

              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Tópicos e sub tópicos</h3>
                    <p className="text-sm text-muted-foreground">Adicione links de vídeo/documentos e descrição (até 2000 caracteres) para cada item.</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      if (!newTopic.title.trim()) return
                      setForm({
                        ...form,
                        topics: [...form.topics, { ...newTopic, order: newTopic.order ?? form.topics.length }],
                      })
                      setNewTopic({ id: crypto.randomUUID(), title: "", description: "", order: form.topics.length, resources: [] })
                    }}
                  >
                    Adicionar tópico
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Título do tópico</label>
                      <Input value={newTopic.title} onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ordem</label>
                      <Input
                        type="number"
                        min={0}
                        value={newTopic.order}
                        onChange={(e) => setNewTopic({ ...newTopic, order: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <RichTextEditor
                    label="Descrição do tópico"
                    value={newTopic.description}
                    onChange={(val) => setNewTopic({ ...newTopic, description: val })}
                    placeholder="Descreva o tópico com formatação rica..."
                  />

                  <div className="border border-brand-border rounded-lg p-3 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="font-medium text-sm">Adicionar recurso (vídeo/documento/link/quiz)</h4>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          setNewResourceQuizError("")
                          if (!newResource.title.trim()) return
                          if (newResourceNeedsUrl && !newResource.url.trim()) return
                          if (isQuizResource) {
                            const quiz = quizDrafts[newResource.id]
                            if (!quiz || quiz.questions.length === 0) {
                              setNewResourceQuizError("Adicione ao menos uma pergunta ao quiz antes de adicionar.")
                              return
                            }
                          }
                          setNewTopic({
                            ...newTopic,
                            resources: [
                              ...newTopic.resources,
                              { ...newResource, url: newResourceNeedsUrl ? newResource.url : "" },
                            ],
                          })
                          setNewResource({
                            id: crypto.randomUUID(),
                            type: "VIDEO",
                            title: "",
                            description: "",
                            url: "",
                            durationMinutes: null,
                          })
                          setNewResourceIsExternal(true)
                          setNewResourceFileName("")
                          setNewResourceQuizError("")
                        }}
                      >
                        Adicionar recurso
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo</label>
                        <select
                          className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm"
                          value={newResource.type}
                          onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
                        >
                          {["VIDEO", "PDF", "DOC", "SLIDE", "SHEET", "IMAGE", "LINK", "QUIZ"].map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Título</label>
                        <Input value={newResource.title} onChange={(e) => setNewResource({ ...newResource, title: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Descrição</label>
                      <textarea
                        className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5dcff] min-h-[60px]"
                        maxLength={2000}
                        value={newResource.description}
                        onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                      />
                    </div>
                    {!isQuizResource && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">URL do recurso</label>
                          <Input
                            value={newResource.url}
                            onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                            placeholder={newResourceIsExternal ? "https://..." : tResources("uploadPlaceholder")}
                            disabled={!newResourceIsExternal && uploadableResourceTypes.has(newResource.type)}
                          />
                        </div>
                        {uploadableResourceTypes.has(newResource.type) && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">{tResources("sourceLabel")}</label>
                            <div className="flex items-center gap-3 text-sm">
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="resource-source-new"
                                  checked={newResourceIsExternal}
                                  onChange={() => {
                                    setNewResourceIsExternal(true)
                                    setNewResource({ ...newResource, url: "" })
                                    setNewResourceFileName("")
                                    if (newResourceFileInputRef.current) {
                                      newResourceFileInputRef.current.value = ""
                                    }
                                  }}
                                />
                                {tResources("externalLink")}
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="resource-source-new"
                                  checked={!newResourceIsExternal}
                                  onChange={() => {
                                    setNewResourceIsExternal(false)
                                    setNewResource({ ...newResource, url: "" })
                                    setNewResourceFileName("")
                                    if (newResourceFileInputRef.current) {
                                      newResourceFileInputRef.current.value = ""
                                    }
                                  }}
                                />
                                {tResources("localUpload")}
                              </label>
                            </div>
                            {!newResourceIsExternal && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <input
                                    ref={newResourceFileInputRef}
                                    type="file"
                                    className="sr-only"
                                    accept={uploadAcceptByType[newResource.type] ?? ""}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0]
                                      if (!file) {
                                        setNewResourceFileName("")
                                        setNewResource((prev) => ({ ...prev, url: "" }))
                                        return
                                      }
                                      setNewResourceUploading(true)
                                      setNewResourceUploadError("")
                                      setNewResourceFileName(file.name)
                                      try {
                                        const result = await uploadResourceFile(file, newResource.type)
                                        setNewResource((prev) => ({ ...prev, url: result.url }))
                                        setNewResourceFileName(result.fileName ?? file.name)
                                      } catch (uploadError) {
                                        console.error(uploadError)
                                        const message = uploadError instanceof Error ? uploadError.message : "Erro ao enviar arquivo. Tente novamente."
                                        setNewResourceUploadError(message)
                                        setNewResource((prev) => ({ ...prev, url: "" }))
                                      } finally {
                                        setNewResourceUploading(false)
                                      }
                                    }}
                                  />
                                  <Button type="button" variant="secondary" onClick={() => newResourceFileInputRef.current?.click()}>
                                    {tResources("chooseFile")}
                                  </Button>
                                  <span className="text-xs text-muted-foreground">
                                    {newResourceFileName ? tResources("selectedFile", { name: newResourceFileName }) : tResources("noFile")}
                                  </span>
                                </div>
                                {newResourceUploading && <p className="text-xs text-muted-foreground">Enviando arquivo...</p>}
                                {newResourceUploadError && <p className="text-xs text-red-500">{newResourceUploadError}</p>}
                                <p className="text-xs text-muted-foreground">{tResources("uploadHint")}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {isQuizResource && newResource.id && (
                      <div className="space-y-2">
                        <QuizBuilder
                          value={quizDrafts[newResource.id] ?? { title: newResource.title, questions: [] }}
                          onChange={(nextQuiz) => {
                            setNewResourceQuizError("")
                            setQuizDrafts((prev) => ({ ...prev, [newResource.id]: nextQuiz }))
                          }}
                        />
                        {newResourceQuizError && <p className="text-xs text-red-500">{newResourceQuizError}</p>}
                      </div>
                    )}

                    {newTopic.resources.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Recursos adicionados</p>
                        <div className="space-y-2">
                          {newTopic.resources.map((r) => (
                            <div key={r.id} className="border border-brand-border rounded-lg p-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
                              <div>
                                <div className="font-semibold">{r.title}</div>
                                <div className="text-muted-foreground">{r.type}</div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setNewTopic({
                                    ...newTopic,
                                    resources: newTopic.resources.filter((res) => res.id !== r.id),
                                  })
                                  setQuizDrafts((prev) => {
                                    const next = { ...prev }
                                    delete next[r.id]
                                    return next
                                  })
                                }}
                              >
                                Remover
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {form.topics.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Tópicos adicionados</h4>
                    <div className="space-y-2">
                      {form.topics.map((t) => (
                        <div key={t.id} className="border border-brand-border rounded-lg p-3 space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="font-semibold">{t.title}</div>
                              <div className="text-xs text-muted-foreground">Ordem {t.order}</div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setForm({ ...form, topics: form.topics.filter((topic) => topic.id !== t.id) })
                                setQuizDrafts((prev) => {
                                  const next = { ...prev }
                                  t.resources
                                    .filter((res) => res.type === "QUIZ")
                                    .forEach((res) => {
                                      delete next[res.id]
                                    })
                                  return next
                                })
                              }}
                            >
                              Remover
                            </Button>
                          </div>
                          <RichTextEditor
                            label="Descrição do tópico"
                            value={t.description}
                            onChange={(val) =>
                              setForm({
                                ...form,
                                topics: form.topics.map((tp) => (tp.id === t.id ? { ...tp, description: val } : tp)),
                              })
                            }
                          />
                          {t.resources.length > 0 && (
                            <div className="mt-2 space-y-1 text-sm">
                              <p className="font-medium">Recursos:</p>
                              {t.resources.map((r) => (
                                <div key={r.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <span>
                                    {r.title} ({r.type})
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setForm({
                                        ...form,
                                        topics: form.topics.map((topic) =>
                                          topic.id === t.id
                                            ? { ...topic, resources: topic.resources.filter((res) => res.id !== r.id) }
                                            : topic,
                                        ),
                                      })
                                    }}
                                  >
                                    Remover
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  {saving ? "Salvando..." : "Criar Trilha"}
                </Button>
                <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => router.push("/admin/learning-paths")}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
