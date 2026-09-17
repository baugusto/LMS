import { prisma } from "@/server/db/prisma"
import { z } from "zod"
import { DashboardService } from "./dashboard.service"

const MAX_PROMPT_LENGTH = 4000
const MAX_OPTION_LENGTH = 1000
const MAX_TEXT_ANSWER_LENGTH = 4000
const MAX_TITLE_LENGTH = 200

export const QuizQuestionTypeEnum = z.enum([
  "SHORT_TEXT",
  "LONG_TEXT",
  "MULTIPLE_CHOICE",
  "SINGLE_CHOICE",
])

export const QuizOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1).max(MAX_OPTION_LENGTH),
  isCorrect: z.boolean(),
  order: z.number().int().nonnegative().optional(),
})

export const QuizQuestionSchema = z.object({
  id: z.string().optional(),
  prompt: z.string().min(1).max(MAX_PROMPT_LENGTH),
  type: QuizQuestionTypeEnum,
  correctTextAnswer: z.string().max(MAX_TEXT_ANSWER_LENGTH).optional().nullable(),
  options: z.array(QuizOptionSchema).optional(),
  order: z.number().int().nonnegative().optional(),
})

export const QuizDefinitionSchema = z.object({
  learningPathId: z.string().min(1),
  resourceId: z.string().min(1),
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  questions: z.array(QuizQuestionSchema).min(1).max(20),
})

export const QuizAnswerSchema = z
  .object({
    questionId: z.string().min(1),
    type: QuizQuestionTypeEnum,
    textAnswer: z.string().max(MAX_TEXT_ANSWER_LENGTH).optional(),
    optionIds: z.array(z.string().min(1)).max(20).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "SHORT_TEXT" || value.type === "LONG_TEXT") {
      if (!value.textAnswer?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Resposta é obrigatória", path: ["textAnswer"] })
      }
      return
    }
    if (!value.optionIds || value.optionIds.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selecione uma opção", path: ["optionIds"] })
    }
  })

export const QuizSubmissionSchema = z.object({
  quizId: z.string().min(1),
  resourceId: z.string().min(1),
  answers: z.array(QuizAnswerSchema).min(1).max(20),
})

export type QuizDefinitionInput = z.infer<typeof QuizDefinitionSchema>
export type QuizSubmissionInput = z.infer<typeof QuizSubmissionSchema>

const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase()

const userCanAccessLearningPath = async (userId: string, role: "ADMIN" | "PARTNER", learningPathId: string) => {
  if (role === "ADMIN") return true
  const profileIds = await DashboardService.getProfileIds(userId)
  const lp = await prisma.learningPath.findUnique({
    where: { id: learningPathId },
    include: { partnerProfiles: true, partnerProfile: true },
  })
  if (!lp) return false
  const lpProfiles = lp.partnerProfiles.length ? lp.partnerProfiles.map((p) => p.partnerProfileId) : [lp.partnerProfileId]
  return lpProfiles.some((pid) => profileIds.includes(pid))
}

const validateQuestionRules = (questions: z.infer<typeof QuizQuestionSchema>[]) => {
  questions.forEach((q, idx) => {
    if (q.type === "SHORT_TEXT" || q.type === "LONG_TEXT") {
      const answer = q.correctTextAnswer?.trim() ?? ""
      if (!answer) {
        throw new Error(`Pergunta ${idx + 1}: resposta correta é obrigatória para textos.`)
      }
      return
    }
    const options = q.options ?? []
    if (options.length < 2) {
      throw new Error(`Pergunta ${idx + 1}: inclua pelo menos 2 opções.`)
    }
    const correctCount = options.filter((o) => o.isCorrect).length
    if (q.type === "SINGLE_CHOICE" && correctCount !== 1) {
      throw new Error(`Pergunta ${idx + 1}: escolha única precisa de exatamente 1 opção correta.`)
    }
    if (q.type === "MULTIPLE_CHOICE" && correctCount < 1) {
      throw new Error(`Pergunta ${idx + 1}: múltipla escolha precisa de ao menos 1 opção correta.`)
    }
  })
}

export async function createOrUpdateQuiz(def: QuizDefinitionInput, _adminUserId: string) {
  const parsed = QuizDefinitionSchema.parse(def)

  const resource = await prisma.resource.findUnique({
    where: { id: parsed.resourceId },
    include: { topic: { select: { learningPathId: true } } },
  })
  if (!resource) throw new Error("Recurso não encontrado.")
  if (resource.type !== "QUIZ") throw new Error("Recurso não é do tipo QUIZ.")
  if (resource.topic.learningPathId !== parsed.learningPathId) {
    throw new Error("Recurso não pertence à trilha informada.")
  }

  validateQuestionRules(parsed.questions)

  const orderedQuestions = parsed.questions.map((q, index) => ({
    ...q,
    order: index,
    correctTextAnswer:
      q.type === "SHORT_TEXT" || q.type === "LONG_TEXT" ? q.correctTextAnswer?.trim() ?? "" : null,
    options:
      q.type === "MULTIPLE_CHOICE" || q.type === "SINGLE_CHOICE"
        ? (q.options ?? []).map((opt, optIndex) => ({
            ...opt,
            order: optIndex,
          }))
        : [],
  }))

  await prisma.$transaction(async (tx) => {
    const upserted = await tx.quiz.upsert({
      where: { resourceId: parsed.resourceId },
      create: { resourceId: parsed.resourceId },
      update: {},
    })

    await tx.quizQuestion.deleteMany({ where: { quizId: upserted.id } })

    for (const question of orderedQuestions) {
      await tx.quizQuestion.create({
        data: {
          quizId: upserted.id,
          order: question.order ?? 0,
          prompt: question.prompt,
          type: question.type,
          correctTextAnswer: question.correctTextAnswer,
          options: question.options?.length
            ? {
                create: question.options.map((opt) => ({
                  text: opt.text,
                  order: opt.order ?? 0,
                  isCorrect: opt.isCorrect,
                })),
              }
            : undefined,
        },
      })
    }
    return upserted
  })

  return getQuizForAdmin(parsed.resourceId)
}

export async function getQuizForAdmin(resourceId: string, _adminUserId?: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { resourceId },
    include: {
      resource: { select: { title: true } },
      questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
    },
  })
  if (!quiz) return null

  return {
    quizId: quiz.id,
    title: quiz.resource.title,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      order: q.order,
      prompt: q.prompt,
      type: q.type,
      correctTextAnswer: q.correctTextAnswer,
      options: q.options.map((o) => ({
        id: o.id,
        order: o.order,
        text: o.text,
        isCorrect: o.isCorrect,
      })),
    })),
  }
}

export async function getQuizForUser(resourceId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user) throw new Error("Usuário não encontrado.")

  const quiz = await prisma.quiz.findUnique({
    where: { resourceId },
    include: {
      resource: {
        select: {
          title: true,
          topic: {
            select: {
              learningPathId: true,
              learningPath: { include: { partnerProfiles: true, partnerProfile: true } },
            },
          },
        },
      },
      questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
    },
  })
  if (!quiz) return null

  const learningPathId = quiz.resource.topic.learningPathId
  const canAccess = await userCanAccessLearningPath(userId, user.role, learningPathId)
  if (!canAccess) return { forbidden: true }

  const attempt = await prisma.quizAttempt.findUnique({
    where: { userId_quizId: { userId, quizId: quiz.id } },
    select: { percent: true, score: true, totalQuestions: true, correctAnswers: true },
  })

  return {
    quizId: quiz.id,
    title: quiz.resource.title,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      order: q.order,
      prompt: q.prompt,
      type: q.type,
      options:
        q.type === "MULTIPLE_CHOICE" || q.type === "SINGLE_CHOICE"
          ? q.options.map((o) => ({ id: o.id, order: o.order, text: o.text }))
          : undefined,
    })),
    hasAttempt: Boolean(attempt),
    attempt: attempt ?? undefined,
  }
}

export async function gradeQuizAttempt(input: QuizSubmissionInput, userId: string, role: "ADMIN" | "PARTNER") {
  const parsed = QuizSubmissionSchema.parse(input)

  const quiz = await prisma.quiz.findUnique({
    where: { id: parsed.quizId },
    include: {
      resource: {
        select: {
          id: true,
          topic: { select: { learningPathId: true, learningPath: { include: { partnerProfiles: true, partnerProfile: true } } } },
        },
      },
      questions: { include: { options: true }, orderBy: { order: "asc" } },
    },
  })
  if (!quiz || quiz.resource.id !== parsed.resourceId) {
    throw new Error("Quiz não encontrado.")
  }

  const learningPathId = quiz.resource.topic.learningPathId
  const canAccess = await userCanAccessLearningPath(userId, role, learningPathId)
  if (!canAccess) {
    return { forbidden: true }
  }

  if (quiz.questions.length > 20) {
    throw new Error("Quiz inválido.")
  }

  const existing = await prisma.quizAttempt.findUnique({
    where: { userId_quizId: { userId, quizId: quiz.id } },
  })
  if (existing) {
    return { alreadySubmitted: true }
  }

  const answerMap = new Map(parsed.answers.map((a) => [a.questionId, a]))

  let correctAnswers = 0
  quiz.questions.forEach((q) => {
    const answer = answerMap.get(q.id)
    if (!answer) return

    if (q.type === "SHORT_TEXT" || q.type === "LONG_TEXT") {
      const expected = normalizeText(q.correctTextAnswer ?? "")
      const received = normalizeText(answer.textAnswer ?? "")
      if (expected && expected === received) correctAnswers += 1
      return
    }

    const selected = new Set(answer.optionIds ?? [])
    const correct = new Set(q.options.filter((o) => o.isCorrect).map((o) => o.id))
    if (q.type === "SINGLE_CHOICE") {
      if (selected.size === 1 && correct.size === 1 && selected.has(Array.from(correct)[0])) {
        correctAnswers += 1
      }
      return
    }

    if (q.type === "MULTIPLE_CHOICE") {
      if (selected.size === correct.size && Array.from(correct).every((id) => selected.has(id))) {
        correctAnswers += 1
      }
    }
  })

  const totalQuestions = quiz.questions.length
  const percent = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
  const score = correctAnswers

  await prisma.$transaction(async (tx) => {
    await tx.quizAttempt.create({
      data: {
        userId,
        quizId: quiz.id,
        learningPathId,
        score,
        percent,
        totalQuestions,
        correctAnswers,
        answers: parsed.answers,
      },
    })

    await tx.progress.upsert({
      where: { userId_resourceId: { userId, resourceId: quiz.resource.id } },
      update: { status: "COMPLETED", completedAt: new Date(), lastViewedAt: new Date() },
      create: { userId, resourceId: quiz.resource.id, status: "COMPLETED", completedAt: new Date(), lastViewedAt: new Date() },
    })

    const total = await tx.resource.count({ where: { topic: { learningPathId } } })
    const completed = await tx.progress.count({
      where: { userId, status: "COMPLETED", resource: { topic: { learningPathId } } },
    })
    const status = completed >= total && total > 0 ? "COMPLETED" : "IN_PROGRESS"

    await tx.enrollment.upsert({
      where: { userId_learningPathId: { userId, learningPathId } },
      update: { status, completedAt: status === "COMPLETED" ? new Date() : null },
      create: { userId, learningPathId, status, startedAt: new Date(), completedAt: status === "COMPLETED" ? new Date() : null },
    })
  })

  return { percent, score, totalQuestions, correctAnswers }
}
