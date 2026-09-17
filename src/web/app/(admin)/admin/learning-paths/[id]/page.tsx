"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import type { ResourceType } from "@prisma/client"
import { useTranslations } from "next-intl"
import { Button } from "@/web/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/web/components/ui/card"
import { Input } from "@/web/components/ui/input"
import { DashboardLayout } from "@/web/components/layout/DashboardLayout"
import { RichTextEditor } from "@/web/components/lms/RichTextEditor"
import { TopicsTree } from "@/web/components/lms/TopicsTree"
import { QuizBuilder, type QuizDefinition } from "@/web/components/lms/QuizBuilder"

type PartnerProfile = { id: string; name: string }
type ResourceInput = {
  id: string
  type: ResourceType
  title: string
  description: string
  url: string
  durationMinutes?: number | null
  order: number
  quiz?: QuizDefinition
}
type TopicInput = { id: string; title: string; description: string; order: number; resources: ResourceInput[] }
type LearningPathForm = {
  id: string
  title: string
  description?: string
  partnerProfileIds: string[]
  order: number
  active: boolean
}

type EditMode = "topic" | "resource" | "none"

const uploadableResourceTypes = new Set<ResourceType>(["DOC", "PDF", "SLIDE", "SHEET", "IMAGE"])
const RESOURCE_DOWNLOAD_PREFIX = "/api/lms/resources/download/"
const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/
const UUID_PREFIX_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i
const LEGACY_STORAGE_PATH_REGEX = /(?:^|[\\/])(storage|resources|uploads)[\\/]/i
const FILE_EXTENSIONS = [
  ".doc",
  ".docx",
  ".pdf",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".csv",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
]
const uploadAcceptByType: Record<string, string> = {
  DOC: ".pdf,.doc,.docx",
  PDF: ".pdf",
  SLIDE: ".ppt,.pptx,.pdf",
  SHEET: ".xls,.xlsx,.csv",
  IMAGE: "image/*",
}

const mapQuizPayload = (payload: any, fallbackTitle: string): QuizDefinition => ({
  title: payload?.title ?? fallbackTitle ?? "",
  questions: Array.isArray(payload?.questions)
    ? payload.questions.map((q: any) => ({
        id: q.id,
        prompt: q.prompt ?? "",
        type: q.type,
        correctTextAnswer: q.correctTextAnswer ?? "",
        order: q.order ?? 0,
        options: Array.isArray(q.options)
          ? q.options.map((o: any, idx: number) => ({
              id: o.id,
              text: o.text ?? "",
              isCorrect: Boolean(o.isCorrect),
              order: o.order ?? idx,
            }))
          : [],
      }))
    : [],
})

const extractYoutubeId = (url: string) => {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/,
    /youtube(?:-nocookie)?\.com\/watch\?.*v=([A-Za-z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return ""
}

const normalizeVideoUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim()
  if (!trimmed) return ""

  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return `https://www.youtube.com/watch?v=${trimmed}`
  }

  let url = trimmed
  if (/^www\./i.test(url)) {
    url = `https://${url}`
  }

  const youtubeId = extractYoutubeId(url)
  if (youtubeId) {
    return `https://www.youtube.com/watch?v=${youtubeId}`
  }

  return ""
}

const normalizeFileKey = (value: string) => {
  try {
    return encodeURIComponent(decodeURIComponent(value))
  } catch {
    return encodeURIComponent(value)
  }
}

const extractLegacyFileKey = (value: string) => {
  const base = value.split("?")[0]?.split("#")[0] ?? ""
  const normalized = base.replace(/\\/g, "/")
  const segments = normalized.split("/")
  return segments[segments.length - 1] ?? ""
}

const looksLikeFileKey = (value: string) => {
  const lower = value.toLowerCase()
  if (UUID_PREFIX_REGEX.test(value)) return true
  if (value.includes(" ")) return true
  return FILE_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

const shouldUseDownloadPrefix = (value: string, type: ResourceType) => {
  if (!uploadableResourceTypes.has(type)) return false
  if (!value) return false
  if (value.startsWith(RESOURCE_DOWNLOAD_PREFIX)) return false
  if (/^https?:\/\//i.test(value) || value.startsWith("//") || value.includes("://")) return false
  if (/^www\./i.test(value)) return false
  const base = value.split("?")[0]?.split("#")[0] ?? ""
  const separatorIndex = base.search(/[\\/]/)
  if (separatorIndex >= 0) {
    const firstSegment = base.slice(0, separatorIndex)
    if (firstSegment.includes(".")) return false
  }
  if (!base) return false
  const normalized = base.replace(/\\/g, "/")
  if (/[\\/]/.test(base)) {
    if (LEGACY_STORAGE_PATH_REGEX.test(base)) return true
    const fileKeyCandidate = extractLegacyFileKey(normalized)
    return looksLikeFileKey(fileKeyCandidate)
  }
  return looksLikeFileKey(normalized)
}

const normalizeResourceUrl = (rawUrl: string, type: ResourceType) => {
  const trimmed = rawUrl.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith(RESOURCE_DOWNLOAD_PREFIX)) return trimmed

  const normalizedPath = trimmed.replace(/\\/g, "/")
  if (/^file:\/\//i.test(normalizedPath)) {
    const filePath = normalizedPath.replace(/^file:\/\//i, "")
    if (shouldUseDownloadPrefix(filePath, type)) {
      const fileKey = extractLegacyFileKey(filePath)
      if (fileKey) {
        return `${RESOURCE_DOWNLOAD_PREFIX}${normalizeFileKey(fileKey)}`
      }
    }
  }
  if (shouldUseDownloadPrefix(normalizedPath, type)) {
    const fileKey = extractLegacyFileKey(normalizedPath)
    if (fileKey) {
      return `${RESOURCE_DOWNLOAD_PREFIX}${normalizeFileKey(fileKey)}`
    }
  }

  if (type === "VIDEO") {
    const normalizedVideo = normalizeVideoUrl(trimmed)
    if (normalizedVideo) return normalizedVideo
  }

  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith("//")) return `https:${trimmed}`
  if (/^[a-z]+:/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

const isValidResourceUrl = (value: string) => {
  if (value.startsWith(RESOURCE_DOWNLOAD_PREFIX)) return true
  if (value.startsWith("data:") || value.startsWith("blob:")) return true
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

const extractFirstErrorMessage = (details: any): string | null => {
  if (!details || typeof details !== "object") return null
  if (Array.isArray(details._errors) && details._errors.length > 0) {
    return details._errors[0]
  }
  for (const value of Object.values(details)) {
    const message = extractFirstErrorMessage(value)
    if (message) return message
  }
  return null
}

export default function EditLearningPathPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const tResources = useTranslations("resources")

  const [profiles, setProfiles] = useState<PartnerProfile[]>([])
  const [form, setForm] = useState<LearningPathForm | null>(null)
  const [topics, setTopics] = useState<TopicInput[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<EditMode>("none")
  const [isDirtyStructure, setIsDirtyStructure] = useState(false)

  const [topicForm, setTopicForm] = useState<Omit<TopicInput, "resources" | "id"> & { id?: string }>({
    id: undefined,
    title: "",
    description: "",
    order: 0,
  })

  const [resourceForm, setResourceForm] = useState<Omit<ResourceInput, "id"> & { id?: string }>({
    id: undefined,
    type: "VIDEO",
    title: "",
    description: "",
    url: "",
    durationMinutes: null,
    order: 0,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notFound, setNotFound] = useState(false)
  const [localError, setLocalError] = useState("")
  const [resourceIsExternal, setResourceIsExternal] = useState(true)
  const [resourceFileName, setResourceFileName] = useState("")
  const [resourceUploading, setResourceUploading] = useState(false)
  const [resourceUploadError, setResourceUploadError] = useState("")
  const [quizDrafts, setQuizDrafts] = useState<Record<string, QuizDefinition>>({})
  const [quizError, setQuizError] = useState("")
  const resourceFileInputRef = useRef<HTMLInputElement | null>(null)
  const topicsSectionRef = useRef<HTMLDivElement | null>(null)
  const isUploadableResourceType = uploadableResourceTypes.has(resourceForm.type)
  const isQuizResourceType = resourceForm.type === "QUIZ"
  const resourceNeedsUrl = !isQuizResourceType

  useEffect(() => {
    if (!uploadableResourceTypes.has(resourceForm.type)) {
      setResourceIsExternal(true)
      setResourceFileName("")
      setResourceUploading(false)
      setResourceUploadError("")
      if (resourceFileInputRef.current) {
        resourceFileInputRef.current.value = ""
      }
    }
  }, [resourceForm.type])

  useEffect(() => {
    const loadQuizDraft = async () => {
      if (resourceForm.type !== "QUIZ" || !resourceForm.id) return
      if (quizDrafts[resourceForm.id]) return
      try {
        setQuizError("")
        const res = await fetch(`/api/admin/quizzes?resourceId=${resourceForm.id}`, { credentials: "include" })
        if (res.ok) {
          const payload = await res.json()
          const draft = mapQuizPayload(payload, resourceForm.title)
          setQuizDrafts((prev) => ({ ...prev, [resourceForm.id as string]: draft }))
          return
        }
      } catch (err) {
        console.error("Erro ao carregar quiz", err)
      }
      setQuizDrafts((prev) =>
        prev[resourceForm.id as string]
          ? prev
          : { ...prev, [resourceForm.id as string]: { title: resourceForm.title, questions: [] } },
      )
    }
    loadQuizDraft()
  }, [resourceForm.type, resourceForm.id, resourceForm.title, quizDrafts])

  const uploadResourceFile = async (file: File, type: ResourceType) => {
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
    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    if (!idParam) {
      setNotFound(true)
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        const [lpRes, pfRes] = await Promise.all([
          fetch(`/api/lms/learning-paths/${idParam}`, { credentials: "include" }),
          fetch("/api/lms/partner-profiles", { credentials: "include" }),
        ])

        if (lpRes.status === 404) {
          setNotFound(true)
          return
        }
        if (!lpRes.ok) throw new Error("Erro ao carregar trilha")
        const lpJson = await lpRes.json()
        const parsedForm: LearningPathForm = {
          id: lpJson.id,
          title: lpJson.title ?? "",
          description: lpJson.description ?? "",
          partnerProfileIds:
            Array.isArray(lpJson.partnerProfiles) && lpJson.partnerProfiles.length > 0
              ? lpJson.partnerProfiles.map((p: any) => p.partnerProfileId)
              : lpJson.partnerProfileId
                ? [lpJson.partnerProfileId]
                : [],
          order: lpJson.order ?? 0,
          active: lpJson.active ?? true,
        }
        const parsedTopics: TopicInput[] =
          lpJson.topics?.map((t: any, idx: number) => ({
            id: t.id ?? crypto.randomUUID(),
            title: t.title ?? "",
            description: t.description ?? "",
            order: t.order ?? idx,
            resources:
              t.resources?.map((r: any, rIdx: number) => ({
                id: r.id ?? crypto.randomUUID(),
                type: r.type ?? "VIDEO",
                title: r.title ?? "",
                description: r.description ?? "",
                url: r.url ?? "",
                durationMinutes: r.durationMinutes ?? null,
                order: r.order ?? rIdx,
              })) ?? [],
          })) ?? []

        setForm(parsedForm)
        setTopics(parsedTopics)

        if (!pfRes.ok) throw new Error("Erro ao carregar perfis")
        const pfJson = await pfRes.json()
        setProfiles(Array.isArray(pfJson) ? pfJson : [])

        const quizResources = parsedTopics.flatMap((t) => t.resources).filter((r) => r.type === "QUIZ")
        if (quizResources.length > 0) {
          const drafts: Record<string, QuizDefinition> = {}
          await Promise.all(
            quizResources.map(async (res) => {
              try {
                const quizRes = await fetch(`/api/admin/quizzes?resourceId=${res.id}`, { credentials: "include" })
                if (quizRes.ok) {
                  const payload = await quizRes.json()
                  drafts[res.id] = mapQuizPayload(payload, res.title)
                  return
                }
              } catch (err) {
                console.error("Erro ao carregar quiz", err)
              }
              drafts[res.id] = { title: res.title, questions: [] }
            }),
          )
          setQuizDrafts((prev) => ({ ...prev, ...drafts }))
        }
      } catch (err) {
        console.error(err)
        setError("Erro ao carregar dados. Verifique sua conexão ou se a sessão é de administrador.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

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
    if (!form) return
    if (!form.title || form.partnerProfileIds.length === 0) {
      setError("Preencha título e selecione ao menos um perfil.")
      return
    }

    try {
      setSaving(true)
      setError("")
      // aplica eventuais edições em andamento antes de enviar
      const pending = applyPendingEdits(topics)
      if (!pending) {
        setSaving(false)
        return
      }
      setTopics(pending)

      let normalizedChanged = false
      let invalidMessage = ""
      const normalizedTopics = pending.map((topic) => {
        let resourcesChanged = false
        const resources = topic.resources.map((resource) => {
          if (resource.type === "QUIZ") return resource
          const normalizedUrl = normalizeResourceUrl(resource.url, resource.type)
          const isValid = normalizedUrl ? isValidResourceUrl(normalizedUrl) : false
          if (!isValid && !invalidMessage) {
            const topicLabel = topic.title ? ` no tópico "${topic.title}"` : ""
            invalidMessage = `URL inválida no recurso "${resource.title}"${topicLabel}.`
          }
          if (normalizedUrl !== resource.url && isValid) {
            resourcesChanged = true
            normalizedChanged = true
            return { ...resource, url: normalizedUrl }
          }
          return resource
        })
        return resourcesChanged ? { ...topic, resources } : topic
      })

      if (invalidMessage) {
        setSaving(false)
        setError(invalidMessage)
        return
      }

      if (normalizedChanged) {
        setTopics(normalizedTopics)
      }

      const quizResources = pending.flatMap((t) => t.resources).filter((r) => r.type === "QUIZ")
      for (const resource of quizResources) {
        const draft = quizDrafts[resource.id]
        if (!draft || draft.questions.length === 0) {
          setSaving(false)
          setError(`O quiz "${resource.title}" precisa ter ao menos uma pergunta.`)
          return
        }
      }

      const res = await fetch(`/api/lms/learning-paths/${form.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          partnerProfileIds: form.partnerProfileIds,
          order: Number.isNaN(form.order) ? 0 : form.order,
          active: form.active,
          topics: normalizedTopics.map((t, idx) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            order: t.order ?? idx,
            resources: t.resources.map((r, rIdx) => ({
              id: r.id,
              type: r.type,
              title: r.title,
              description: r.description,
              url: r.type === "QUIZ" ? "" : r.url,
              durationMinutes: r.durationMinutes,
              order: r.order ?? rIdx,
            })),
          })),
        }),
      })
      if (!res.ok) {
        const errorPayload = await res.json().catch(() => null)
        const detailsMessage = extractFirstErrorMessage(errorPayload?.details)
        const message = detailsMessage
          ? `${errorPayload?.error ?? "Dados inválidos"}: ${detailsMessage}`
          : errorPayload?.error ?? "Erro ao atualizar trilha"
        throw new Error(message)
      }
      const payload = await res.json().catch(() => null)
      const learningPathId = payload?.id ?? form.id
      await saveQuizzes(learningPathId, pending)
      router.push("/admin/learning-paths")
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : "Erro ao atualizar trilha. Verifique os dados e tente novamente."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const applyPendingEdits = (currentTopics: TopicInput[]) => {
    if (editMode === "topic") {
      if (!topicForm.title.trim()) {
        setLocalError("Título do tópico é obrigatório.")
        return null
      }
      if (!selectedTopicId) {
        const newTopic: TopicInput = {
          id: crypto.randomUUID(),
          title: topicForm.title,
          description: topicForm.description ?? "",
          order: topicForm.order ?? currentTopics.length,
          resources: [],
        }
        return [...currentTopics, newTopic]
      }
      return currentTopics.map((t) =>
        t.id === selectedTopicId ? { ...t, title: topicForm.title, description: topicForm.description, order: topicForm.order } : t,
      )
    }
    if (editMode === "resource") {
      if (!selectedTopicId) {
        setLocalError("Selecione um tópico antes de adicionar um recurso.")
        return null
      }
      if (!resourceForm.title.trim()) {
        setLocalError("Título do recurso é obrigatório.")
        return null
      }
      if (resourceNeedsUrl && !resourceForm.url.trim()) {
        setLocalError("Informe um link ou selecione um arquivo para o recurso.")
        return null
      }
      if (resourceForm.type === "QUIZ") {
        const quiz = resourceForm.id ? quizDrafts[resourceForm.id] : null
        if (!quiz || quiz.questions.length === 0) {
          setLocalError("Adicione ao menos uma pergunta ao quiz antes de salvar.")
          return null
        }
      }
      const resourceIdToUpdate = selectedResourceId
      return currentTopics.map((t) => {
        if (t.id !== selectedTopicId) return t
        if (!resourceIdToUpdate) {
          const newResource: ResourceInput = {
            id: resourceForm.id ?? crypto.randomUUID(),
            type: resourceForm.type,
            title: resourceForm.title,
            description: resourceForm.description ?? "",
            url: resourceNeedsUrl ? resourceForm.url : "",
            durationMinutes: resourceForm.durationMinutes ?? null,
            order: resourceForm.order ?? t.resources.length,
          }
          return { ...t, resources: [...t.resources, newResource] }
        }
        return {
          ...t,
          resources: t.resources.map((r) =>
            r.id === resourceIdToUpdate
              ? {
                  ...r,
                  type: resourceForm.type,
                  title: resourceForm.title,
                  description: resourceForm.description ?? "",
                  url: resourceNeedsUrl ? resourceForm.url : "",
                  durationMinutes: resourceForm.durationMinutes ?? null,
                  order: resourceForm.order ?? r.order,
                }
              : r,
          ),
        }
      })
    }
    return currentTopics
  }

  const resetTopicForm = (topic?: TopicInput) => {
    if (topic) {
      setTopicForm({ id: topic.id, title: topic.title, description: topic.description ?? "", order: topic.order ?? 0 })
    } else {
      setTopicForm({ id: undefined, title: "", description: "", order: topics.length })
    }
  }

  const resetResourceForm = (resource?: ResourceInput, parentTopic?: TopicInput) => {
    setResourceIsExternal(true)
    setResourceFileName("")
    setResourceUploading(false)
    setResourceUploadError("")
    if (resourceFileInputRef.current) {
      resourceFileInputRef.current.value = ""
    }
    if (resource) {
      setResourceForm({
        id: resource.id,
        type: resource.type,
        title: resource.title,
        description: resource.description ?? "",
        url: resource.url,
        durationMinutes: resource.durationMinutes ?? null,
        order: resource.order ?? 0,
      })
    } else {
      const defaultOrder = parentTopic ? parentTopic.resources.length : 0
      setResourceForm({
        id: crypto.randomUUID(),
        type: "VIDEO",
        title: "",
        description: "",
        url: "",
        durationMinutes: null,
        order: defaultOrder,
      })
    }
  }

  const handleNewTopic = () => {
    setSelectedTopicId(null)
    setSelectedResourceId(null)
    setEditMode("topic")
    resetTopicForm()
    resetResourceForm()
    requestAnimationFrame(() => {
      topicsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  const handleEditTopic = (topicId: string) => {
    const topic = topics.find((t) => t.id === topicId)
    if (!topic) return
    setSelectedTopicId(topicId)
    setSelectedResourceId(null)
    setEditMode("topic")
    resetTopicForm(topic)
    resetResourceForm()
  }

  const handleNewResource = (topicId: string) => {
    const topic = topics.find((t) => t.id === topicId)
    if (!topic) return
    setSelectedTopicId(topicId)
    setSelectedResourceId(null)
    setEditMode("resource")
    resetTopicForm(topic)
    resetResourceForm(undefined, topic)
  }

  const handleEditResource = (topicId: string, resourceId: string) => {
    const topic = topics.find((t) => t.id === topicId)
    const resource = topic?.resources.find((r) => r.id === resourceId)
    if (!topic || !resource) return
    setSelectedTopicId(topicId)
    setSelectedResourceId(resourceId)
    setEditMode("resource")
    resetTopicForm(topic)
    resetResourceForm(resource, topic)
  }

  const handleDeleteTopic = (topicId: string) => {
    if (!window.confirm("Tem certeza que deseja remover este tópico? Essa alteração só será enviada ao salvar a trilha.")) return
    const topic = topics.find((t) => t.id === topicId)
    if (topic) {
      setQuizDrafts((prev) => {
        const next = { ...prev }
        topic.resources
          .filter((r) => r.type === "QUIZ")
          .forEach((r) => {
            delete next[r.id]
          })
        return next
      })
    }
    setTopics((prev) => prev.filter((t) => t.id !== topicId))
    setIsDirtyStructure(true)
    if (selectedTopicId === topicId) {
      setSelectedTopicId(null)
      setSelectedResourceId(null)
      setEditMode("none")
      resetTopicForm()
      resetResourceForm()
    }
  }

  const handleDeleteResource = (topicId: string, resourceId: string) => {
    if (!window.confirm("Tem certeza que deseja remover este recurso? Essa alteração só será enviada ao salvar a trilha.")) return
    setQuizDrafts((prev) => {
      const next = { ...prev }
      delete next[resourceId]
      return next
    })
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, resources: t.resources.filter((r) => r.id !== resourceId) } : t)),
    )
    setIsDirtyStructure(true)
    if (selectedResourceId === resourceId) {
      setSelectedResourceId(null)
      setEditMode("none")
      resetResourceForm()
    }
  }

  const handleSaveLocal = () => {
    setLocalError("")
    if (editMode === "topic") {
      if (!topicForm.title.trim()) {
        setLocalError("Título do tópico é obrigatório.")
        return
      }
      let targetTopicId = selectedTopicId
      let nextTopics: TopicInput[] = topics
      if (!selectedTopicId) {
        const newId = crypto.randomUUID()
        const newTopic: TopicInput = {
          id: newId,
          title: topicForm.title,
          description: topicForm.description ?? "",
          order: topicForm.order ?? topics.length,
          resources: [],
        }
        nextTopics = [...topics, newTopic]
        targetTopicId = newId
        setTopics(nextTopics)
        setSelectedTopicId(newId)
      } else {
        nextTopics = topics.map((t) =>
          t.id === selectedTopicId ? { ...t, title: topicForm.title, description: topicForm.description, order: topicForm.order } : t,
        )
        setTopics(nextTopics)
      }
      // Se houver dados de recurso preenchidos, aplica junto
      if (resourceForm.title.trim() && (!resourceNeedsUrl || resourceForm.url.trim()) && targetTopicId) {
        const resourceIdToUpdate = selectedResourceId
        if (resourceForm.type === "QUIZ") {
          const quiz = resourceForm.id ? quizDrafts[resourceForm.id] : null
          if (!quiz || quiz.questions.length === 0) {
            setLocalError("Adicione ao menos uma pergunta ao quiz antes de salvar.")
            return
          }
        }
        nextTopics = nextTopics.map((t) => {
          if (t.id !== targetTopicId) return t
          if (!resourceIdToUpdate) {
            const newResource: ResourceInput = {
              id: resourceForm.id ?? crypto.randomUUID(),
              type: resourceForm.type,
              title: resourceForm.title,
              description: resourceForm.description ?? "",
              url: resourceNeedsUrl ? resourceForm.url : "",
              durationMinutes: resourceForm.durationMinutes ?? null,
              order: resourceForm.order ?? t.resources.length,
            }
            return { ...t, resources: [...t.resources, newResource] }
          }
          return {
            ...t,
            resources: t.resources.map((r) =>
              r.id === resourceIdToUpdate
                ? {
                    ...r,
                    type: resourceForm.type,
                    title: resourceForm.title,
                    description: resourceForm.description ?? "",
                    url: resourceNeedsUrl ? resourceForm.url : "",
                    durationMinutes: resourceForm.durationMinutes ?? null,
                    order: resourceForm.order ?? r.order,
                  }
                : r,
            ),
          }
        })
        setTopics(nextTopics)
      }
      setIsDirtyStructure(true)
      setEditMode("none")
    } else if (editMode === "resource") {
      if (!selectedTopicId) {
        setLocalError("Selecione um tópico antes de adicionar um recurso.")
        return
      }
      const resourceIdToUpdate = selectedResourceId
      if (!resourceForm.title.trim()) {
        setLocalError("Título do recurso é obrigatório.")
        return
      }
      if (resourceNeedsUrl && !resourceForm.url.trim()) {
        setLocalError("Informe um link ou selecione um arquivo para o recurso.")
        return
      }
      if (resourceForm.type === "QUIZ") {
        const quiz = resourceForm.id ? quizDrafts[resourceForm.id] : null
        if (!quiz || quiz.questions.length === 0) {
          setLocalError("Adicione ao menos uma pergunta ao quiz antes de salvar.")
          return
        }
      }
      setTopics((prev) =>
        prev.map((t) => {
          if (t.id !== selectedTopicId) return t
          if (!resourceIdToUpdate) {
            const newResource: ResourceInput = {
              id: resourceForm.id ?? crypto.randomUUID(),
              type: resourceForm.type,
              title: resourceForm.title,
              description: resourceForm.description ?? "",
              url: resourceNeedsUrl ? resourceForm.url : "",
              durationMinutes: resourceForm.durationMinutes ?? null,
              order: resourceForm.order ?? t.resources.length,
            }
            return { ...t, resources: [...t.resources, newResource] }
          }
          return {
            ...t,
            resources: t.resources.map((r) =>
              r.id === resourceIdToUpdate
                ? {
                    ...r,
                    type: resourceForm.type,
                    title: resourceForm.title,
                    description: resourceForm.description ?? "",
                    url: resourceNeedsUrl ? resourceForm.url : "",
                    durationMinutes: resourceForm.durationMinutes ?? null,
                    order: resourceForm.order ?? r.order,
                  }
                : r,
            ),
          }
        }),
      )
      setIsDirtyStructure(true)
      setEditMode("none")
    }
  }

  const handleDiscardLocal = () => {
    setEditMode("none")
    resetTopicForm()
    resetResourceForm()
    setSelectedResourceId(null)
    setLocalError("")
    setQuizError("")
  }

  const sortedTopics = useMemo(() => [...topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [topics])

  if (loading) {
    return (
      <DashboardLayout active="admin-trilhas" isAdmin>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </DashboardLayout>
    )
  }

  if (notFound || !form) {
    return (
      <DashboardLayout active="admin-trilhas" isAdmin>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Trilha não encontrada.</p>
          <Button onClick={() => router.push("/admin/learning-paths")}>Voltar</Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout active="admin-trilhas" isAdmin>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Editar Trilha</h1>
            <p className="text-sm text-muted-foreground">Atualize as informações da trilha de conhecimento</p>
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
                value={form.description ?? ""}
                onChange={(val) => setForm({ ...form!, description: val })}
                placeholder="Descreva a trilha com formatação rica..."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Perfis de parceria</label>
                  <div className="flex flex-wrap gap-2">
                    {profiles.map((p) => {
                      const activeProfile = form.partnerProfileIds.includes(p.id)
                      return (
                        <button
                          type="button"
                          key={p.id}
                          className={`px-3 py-1 rounded-full text-sm border ${
                            activeProfile ? "bg-blue-500 text-white border-blue-500" : "border-brand-border text-foreground"
                          }`}
                          onClick={() =>
                            setForm({
                              ...form,
                              partnerProfileIds: activeProfile
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
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ordem</label>
                  <Input type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Trilha ativa
              </label>

              <div className="space-y-4" ref={topicsSectionRef}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Tópicos e sub tópicos</h3>
                    <p className="text-sm text-muted-foreground">
                      Adicione, edite ou remova tópicos e materiais. As mudanças desta seção são locais até salvar a trilha.
                    </p>
                  </div>
                  {isDirtyStructure && <span className="text-xs text-primary">Possui alterações locais</span>}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
                  <Card className="h-full min-w-0">
                    <CardContent className="p-4 space-y-4">
                      <div>
                        {editMode === "topic" && <h4 className="font-semibold text-foreground">{topicForm.id ? "Editar tópico" : "Novo tópico"}</h4>}
                        {editMode === "resource" && (
                          <h4 className="font-semibold text-foreground">{resourceForm.id ? "Editar recurso" : "Novo recurso"}</h4>
                        )}
                        {editMode === "none" && (
                          <p className="text-sm text-muted-foreground">Selecione um tópico na árvore ao lado ou clique em “Novo tópico”.</p>
                        )}
                      </div>

                      {(editMode === "topic" || editMode === "resource") && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Título do tópico <span className="text-red-600">*</span>
                            </label>
                            <Input value={topicForm.title} onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })} required />
                          </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Ordem</label>
                              <Input
                                type="number"
                                min={0}
                                value={topicForm.order}
                                onChange={(e) => setTopicForm({ ...topicForm, order: Number(e.target.value) })}
                              />
                            </div>
                          </div>
                          <RichTextEditor
                            label="Descrição do tópico"
                            value={topicForm.description}
                            onChange={(val) => setTopicForm({ ...topicForm, description: val })}
                            placeholder="Descreva o tópico..."
                          />

                          <div className="border border-brand-border rounded-lg p-3 space-y-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <h5 className="font-semibold text-sm">Recurso do tópico</h5>
                              <span className="text-xs text-muted-foreground">
                                {resourceForm.id ? "Editando recurso" : "Novo recurso"} {topicForm.title && `em ${topicForm.title}`}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Tipo</label>
                                <select
                                  className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm"
                                  value={resourceForm.type}
                                  onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value as ResourceType })}
                                >
                                  {["VIDEO", "PDF", "DOC", "SLIDE", "SHEET", "IMAGE", "LINK", "QUIZ"].map((t) => (
                                    <option key={t}>{t}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Título do recurso <span className="text-red-600">*</span>
                                </label>
                                <Input value={resourceForm.title} onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })} required />
                              </div>
                            </div>
                            {!isQuizResourceType && (
                              <>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">URL</label>
                                  <Input
                                    value={resourceForm.url}
                                    onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                                    placeholder={resourceIsExternal ? "https://..." : tResources("uploadPlaceholder")}
                                    disabled={isUploadableResourceType && !resourceIsExternal}
                                    required
                                  />
                                </div>
                                {isUploadableResourceType && (
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">{tResources("sourceLabel")}</label>
                                    <div className="flex items-center gap-3 text-sm">
                                      <label className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name="resource-source"
                                          checked={resourceIsExternal}
                                          onChange={() => {
                                            setResourceIsExternal(true)
                                            setResourceForm({ ...resourceForm, url: "" })
                                            setResourceFileName("")
                                            if (resourceFileInputRef.current) {
                                              resourceFileInputRef.current.value = ""
                                            }
                                          }}
                                        />
                                        {tResources("externalLink")}
                                      </label>
                                      <label className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name="resource-source"
                                          checked={!resourceIsExternal}
                                          onChange={() => {
                                            setResourceIsExternal(false)
                                            setResourceForm({ ...resourceForm, url: "" })
                                            setResourceFileName("")
                                            if (resourceFileInputRef.current) {
                                              resourceFileInputRef.current.value = ""
                                            }
                                          }}
                                        />
                                        {tResources("localUpload")}
                                      </label>
                                    </div>
                                    {!resourceIsExternal && (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                          <input
                                            ref={resourceFileInputRef}
                                            type="file"
                                            className="sr-only"
                                            accept={uploadAcceptByType[resourceForm.type] ?? ""}
                                            onChange={async (e) => {
                                              const file = e.target.files?.[0]
                                              if (!file) {
                                                setResourceFileName("")
                                                setResourceForm((prev) => ({ ...prev, url: "" }))
                                                return
                                              }
                                              setResourceUploading(true)
                                              setResourceUploadError("")
                                              setResourceFileName(file.name)
                                              try {
                                                const result = await uploadResourceFile(file, resourceForm.type)
                                                setResourceForm((prev) => ({ ...prev, url: result.url }))
                                                setResourceFileName(result.fileName ?? file.name)
                                              } catch (uploadError) {
                                                console.error(uploadError)
                                                const message = uploadError instanceof Error ? uploadError.message : "Erro ao enviar arquivo. Tente novamente."
                                                setResourceUploadError(message)
                                                setResourceForm((prev) => ({ ...prev, url: "" }))
                                              } finally {
                                                setResourceUploading(false)
                                              }
                                            }}
                                          />
                                          <Button type="button" variant="secondary" onClick={() => resourceFileInputRef.current?.click()}>
                                            {tResources("chooseFile")}
                                          </Button>
                                          <span className="text-xs text-muted-foreground">
                                            {resourceFileName ? tResources("selectedFile", { name: resourceFileName }) : tResources("noFile")}
                                          </span>
                                        </div>
                                        {resourceUploading && <p className="text-xs text-muted-foreground">Enviando arquivo...</p>}
                                        {resourceUploadError && <p className="text-xs text-red-500">{resourceUploadError}</p>}
                                        <p className="text-xs text-muted-foreground">{tResources("uploadHint")}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                            {isQuizResourceType && resourceForm.id && (
                              <div className="space-y-2">
                                <QuizBuilder
                                  value={quizDrafts[resourceForm.id] ?? { title: resourceForm.title, questions: [] }}
                                  onChange={(nextQuiz) => {
                                    setQuizError("")
                                    setQuizDrafts((prev) => ({ ...prev, [resourceForm.id as string]: nextQuiz }))
                                  }}
                                />
                                {quizError && <p className="text-xs text-red-500">{quizError}</p>}
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Ordem</label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={resourceForm.order ?? 0}
                                  onChange={(e) => setResourceForm({ ...resourceForm, order: Number(e.target.value) })}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Descrição do recurso</label>
                                <textarea
                                  className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5dcff] min-h-[80px]"
                                  value={resourceForm.description}
                                  onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                                  maxLength={2000}
                                />
                              </div>
                            </div>
                          </div>

                        {localError && <p className="text-sm text-red-600">{localError}</p>}

                        <div className="flex gap-2 justify-end">
                          <Button type="button" onClick={handleSaveLocal}>
                            Salvar Tópico
                          </Button>
                          <Button type="button" variant="secondary" onClick={handleDiscardLocal}>
                            Descartar
                          </Button>
                        </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="h-full min-w-0">
                    <TopicsTree
                    topics={sortedTopics}
                    selectedTopicId={selectedTopicId}
                    selectedResourceId={selectedResourceId}
                    onSelectTopic={(id) => {
                      setSelectedTopicId(id)
                      setSelectedResourceId(null)
                    }}
                    onSelectResource={(topicId, resourceId) => {
                      handleEditResource(topicId, resourceId)
                    }}
                    onEditTopic={handleEditTopic}
                    onEditResource={handleEditResource}
                      onDeleteTopic={handleDeleteTopic}
                      onDeleteResource={handleDeleteResource}
                      onNewTopic={handleNewTopic}
                      onNewResource={handleNewResource}
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => router.push("/admin/learning-paths")}>
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
