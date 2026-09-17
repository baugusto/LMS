import { z } from "zod"

export const LearningPathBaseSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(10000).optional().default(""),
  partnerProfileIds: z.array(z.string().min(1)).min(1, "Selecione pelo menos um perfil"),
  order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
})

const isValidResourceUrl = (value: string) => {
  if (value.startsWith("/api/lms/resources/download/")) return true
  if (value.startsWith("data:") || value.startsWith("blob:")) return true
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

const resourceUrlSchema = z.string().refine(
  (value) => {
    if (!value) return true
    if (value.startsWith("data:") || value.startsWith("blob:")) return true
    return value.length <= 2048
  },
  { message: "URL excede o limite de 2048 caracteres" },
)

export const ResourceInputSchema = z
  .object({
    id: z.string().min(1).optional(),
    type: z.enum(["VIDEO", "PDF", "DOC", "SLIDE", "SHEET", "IMAGE", "LINK", "QUIZ"]),
    title: z.string().min(1).max(200),
    description: z.string().max(10000).optional().default(""),
    url: resourceUrlSchema.optional().default(""),
    durationMinutes: z.number().int().min(0).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "QUIZ") {
      return
    }
    const url = value.url ?? ""
    if (!url || !isValidResourceUrl(url)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "URL inválida", path: ["url"] })
    }
  })

export const TopicInputSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional().default(""),
  order: z.number().int().min(0).default(0),
  resources: z.array(ResourceInputSchema).optional().default([]),
})

export const TopicsArraySchema = z.array(TopicInputSchema).optional().default([])

export const CreateLearningPathSchema = LearningPathBaseSchema.extend({
  topics: TopicsArraySchema,
})
export const UpdateLearningPathSchema = LearningPathBaseSchema.extend({
  topics: TopicsArraySchema,
}).partial()

// Legacy exports (ainda usados em outras rotas)
export const learningPathSchema = CreateLearningPathSchema

export const topicSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  order: z.number().optional(),
})

const resourceSchemaBase = z.object({
  type: z.enum(["VIDEO", "PDF", "DOC", "SLIDE", "SHEET", "IMAGE", "LINK", "QUIZ"]),
  title: z.string().min(2),
  description: z.string().min(2),
  url: resourceUrlSchema.optional().default(""),
  durationMinutes: z.number().int().optional().nullable(),
})

export const resourceSchema = resourceSchemaBase.superRefine((value, ctx) => {
  if (value.type === "QUIZ") return
  const url = value.url ?? ""
  if (!url || !isValidResourceUrl(url)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "URL inválida", path: ["url"] })
  }
})

export const resourceUpdateSchema = resourceSchemaBase.partial().superRefine((value, ctx) => {
  if (value.url === undefined) return
  if (value.type === "QUIZ") return
  const url = value.url ?? ""
  if (!url || !isValidResourceUrl(url)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "URL inválida", path: ["url"] })
  }
})
