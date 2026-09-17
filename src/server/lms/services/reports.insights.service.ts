import { prisma } from "@/server/db/prisma"
import { Prisma } from "@prisma/client"
import { addWeeks, differenceInDays, startOfWeek, subDays, subWeeks } from "date-fns"

export type LearningPathInsight = {
  learningPathId: string
  learningPathTitle: string
  companyId?: string
  companyName?: string
  partnerProfileId?: string
  partnerProfileName?: string
  avgProgress: number
  completionRate: number
  avgTimeToCompleteDays?: number | null
  startedUsers: number
  completedUsers: number
  totalUsers: number
  weeklyProgressSeries: {
    weekStart: string
    avgProgress: number
    startedUsers: number
    completedUsers: number
  }[]
}

export type QuizInsight = {
  quizId: string
  quizTitle: string
  learningPathId: string
  learningPathTitle: string
  avgScorePercent: number
  attemptsCount: number
  passRate: number
  scoreBuckets: {
    range: string
    count: number
  }[]
  hardestQuestions: QuestionInsight[]
  easiestQuestions: QuestionInsight[]
}

export type QuestionInsight = {
  questionId: string
  prompt: string
  accuracyPercent: number
  difficultyIndex: number
  attempts: number
}

export type UserRiskInsight = {
  userId: string
  userName: string
  email: string
  companyName?: string
  partnerProfileName?: string
  learningPathId: string
  learningPathTitle: string
  lastActivityAt: string
  avgProgress: number
  quizAvgPercent?: number | null
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
}

type ScopedUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: { id: string; name: string } | null
  partnerLinks: { partnerProfile: { id: string; name: string } }[]
}

type UserPathAggregate = {
  userId: string
  learningPathId: string
  sumProgress: number
  countProgress: number
  firstActivity?: Date
  lastVideoAt?: Date
  lastQuizAt?: Date
  completedAt?: Date
  quizSum?: number
  quizCount?: number
}

type UserPathStats = {
  userId: string
  learningPathId: string
  avgProgress: number
  firstActivity?: Date
  completedAt?: Date
  lastActivity?: Date
  quizAvgPercent?: number | null
}

type QuizAnswerRecord = {
  questionId?: string
  type?: string
  textAnswer?: string | null
  optionIds?: string[] | null
}

const WEEKS_WINDOW = 12
const COMPLETION_THRESHOLD = 90
const PASS_THRESHOLD = 70
const HIGH_RISK_DAYS = 14

const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase()

const safeDateMin = (a?: Date, b?: Date) => {
  if (!a) return b
  if (!b) return a
  return a < b ? a : b
}

const safeDateMax = (a?: Date, b?: Date) => {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10)

const buildUserWhere = (params?: { companyId?: string; partnerProfileId?: string }): Prisma.UserWhereInput => {
  const where: Prisma.UserWhereInput = {}
  if (params?.companyId) {
    where.companyId = params.companyId
  }
  if (params?.partnerProfileId) {
    where.partnerLinks = { some: { partnerProfileId: params.partnerProfileId } }
  }
  return where
}

async function fetchScopedUsers(params?: { companyId?: string; partnerProfileId?: string }): Promise<ScopedUser[]> {
  const where = buildUserWhere(params)
  return prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      company: { select: { id: true, name: true } },
      partnerLinks: { select: { partnerProfile: { select: { id: true, name: true } } } },
    },
  })
}

function groupUserPathStats(entries: UserPathAggregate[]): UserPathStats[] {
  return entries.map((entry) => {
    const avgProgress = entry.countProgress > 0 ? Math.round(entry.sumProgress / entry.countProgress) : 0
    const lastActivity = safeDateMax(entry.lastVideoAt, entry.lastQuizAt)
    const completedAt = avgProgress >= COMPLETION_THRESHOLD ? entry.completedAt ?? entry.lastVideoAt ?? entry.lastQuizAt : undefined
    const quizAvgPercent =
      entry.quizCount && entry.quizCount > 0 && entry.quizSum !== undefined
        ? Math.round(entry.quizSum / entry.quizCount)
        : null

    return {
      userId: entry.userId,
      learningPathId: entry.learningPathId,
      avgProgress,
      firstActivity: entry.firstActivity,
      completedAt,
      lastActivity,
      quizAvgPercent,
    }
  })
}

function buildWeeksWindow() {
  const now = new Date()
  const base = startOfWeek(now, { weekStartsOn: 1 })
  return Array.from({ length: WEEKS_WINDOW }, (_, index) => {
    const week = subWeeks(base, WEEKS_WINDOW - 1 - index)
    return startOfWeek(week, { weekStartsOn: 1 })
  })
}

export async function getLearningPathInsights(params?: {
  companyId?: string
  partnerProfileId?: string
  learningPathId?: string
}): Promise<LearningPathInsight[]> {
  const [company, profile, users] = await Promise.all([
    params?.companyId
      ? prisma.company.findUnique({ where: { id: params.companyId }, select: { id: true, name: true } })
      : Promise.resolve(null),
    params?.partnerProfileId
      ? prisma.partnerProfile.findUnique({ where: { id: params.partnerProfileId }, select: { id: true, name: true } })
      : Promise.resolve(null),
    fetchScopedUsers(params),
  ])

  const userIds = users.map((u) => u.id)
  if (userIds.length === 0) return []

  const [videoProgresses, quizAttempts] = await Promise.all([
    prisma.videoProgress.findMany({
      where: {
        userId: { in: userIds },
        ...(params?.learningPathId ? { learningPathId: params.learningPathId } : {}),
      },
      select: {
        userId: true,
        learningPathId: true,
        maxPercentViewed: true,
        createdAt: true,
        updatedAt: true,
        completed: true,
      },
    }),
    prisma.quizAttempt.findMany({
      where: {
        userId: { in: userIds },
        ...(params?.learningPathId ? { learningPathId: params.learningPathId } : {}),
      },
      select: {
        userId: true,
        learningPathId: true,
        submittedAt: true,
      },
    }),
  ])

  const aggregateMap = new Map<string, UserPathAggregate>()
  const ensure = (userId: string, learningPathId: string) => {
    const key = `${userId}:${learningPathId}`
    const existing =
      aggregateMap.get(key) ??
      ({
        userId,
        learningPathId,
        sumProgress: 0,
        countProgress: 0,
      } as UserPathAggregate)
    aggregateMap.set(key, existing)
    return existing
  }

  videoProgresses.forEach((vp) => {
    const entry = ensure(vp.userId, vp.learningPathId)
    entry.sumProgress += vp.maxPercentViewed ?? 0
    entry.countProgress += 1
    entry.firstActivity = safeDateMin(entry.firstActivity, vp.createdAt)
    entry.lastVideoAt = safeDateMax(entry.lastVideoAt, vp.updatedAt)
    if (vp.completed || (vp.maxPercentViewed ?? 0) >= COMPLETION_THRESHOLD) {
      entry.completedAt = safeDateMax(entry.completedAt, vp.updatedAt)
    }
  })

  quizAttempts.forEach((qa) => {
    const entry = ensure(qa.userId, qa.learningPathId)
    entry.firstActivity = safeDateMin(entry.firstActivity, qa.submittedAt)
    entry.lastQuizAt = safeDateMax(entry.lastQuizAt, qa.submittedAt)
  })

  const userPathStats = groupUserPathStats(Array.from(aggregateMap.values()))
  const learningPathIds = new Set<string>([
    ...videoProgresses.map((vp) => vp.learningPathId),
    ...quizAttempts.map((qa) => qa.learningPathId),
  ])
  if (params?.learningPathId) learningPathIds.add(params.learningPathId)

  const learningPaths = await prisma.learningPath.findMany({
    where: { id: { in: Array.from(learningPathIds) } },
    select: { id: true, title: true },
  })
  const learningPathMap = new Map(learningPaths.map((lp) => [lp.id, lp.title]))

  const weeksWindow = buildWeeksWindow()
  const totalUsers = users.length

  const pathBuckets = new Map<string, UserPathStats[]>()
  userPathStats.forEach((stat) => {
    const list = pathBuckets.get(stat.learningPathId) ?? []
    list.push(stat)
    pathBuckets.set(stat.learningPathId, list)
  })

  const insights: LearningPathInsight[] = []
  learningPathIds.forEach((learningPathId) => {
    const stats = pathBuckets.get(learningPathId) ?? []
    const startedUsers = stats.length
    const completedUsers = stats.filter((s) => s.avgProgress >= COMPLETION_THRESHOLD).length
    const sumAvgProgress = stats.reduce((sum, s) => sum + s.avgProgress, 0)
    const avgProgress = totalUsers > 0 ? Math.round(sumAvgProgress / totalUsers) : 0
    const completionRate = totalUsers > 0 ? Math.round((completedUsers / totalUsers) * 100) : 0

    const completedDurations = stats
      .filter((s) => s.completedAt && s.firstActivity)
      .map((s) => differenceInDays(s.completedAt as Date, s.firstActivity as Date))
    const avgTimeToCompleteDays =
      completedDurations.length > 0
        ? Math.round(completedDurations.reduce((sum, d) => sum + d, 0) / completedDurations.length)
        : null

    const weeklyProgressSeries = weeksWindow.map((weekStart) => {
      const weekEnd = addWeeks(weekStart, 1)
      const started = stats.filter((s) => s.firstActivity && s.firstActivity >= weekStart && s.firstActivity < weekEnd)
      const completed = stats.filter((s) => s.completedAt && s.completedAt >= weekStart && s.completedAt < weekEnd)
      const active = stats.filter((s) => s.lastActivity && s.lastActivity >= weekStart && s.lastActivity < weekEnd)
      const avgWeekProgress = active.length
        ? Math.round(active.reduce((sum, s) => sum + s.avgProgress, 0) / active.length)
        : 0

      return {
        weekStart: toIsoDate(weekStart),
        avgProgress: avgWeekProgress,
        startedUsers: started.length,
        completedUsers: completed.length,
      }
    })

    insights.push({
      learningPathId,
      learningPathTitle: learningPathMap.get(learningPathId) ?? "Trilha",
      companyId: company?.id ?? undefined,
      companyName: company?.name ?? undefined,
      partnerProfileId: profile?.id ?? undefined,
      partnerProfileName: profile?.name ?? undefined,
      avgProgress,
      completionRate,
      avgTimeToCompleteDays,
      startedUsers,
      completedUsers,
      totalUsers,
      weeklyProgressSeries,
    })
  })

  return insights.sort((a, b) => a.learningPathTitle.localeCompare(b.learningPathTitle))
}

export async function getQuizInsights(params?: {
  learningPathId?: string
  companyId?: string
  partnerProfileId?: string
}): Promise<QuizInsight[]> {
  const users = await fetchScopedUsers(params)
  const userIds = users.map((u) => u.id)
  if (userIds.length === 0) return []

  const quizzes = await prisma.quiz.findMany({
    where: params?.learningPathId
      ? { resource: { topic: { learningPathId: params.learningPathId } } }
      : undefined,
    include: {
      resource: {
        select: {
          title: true,
          topic: {
            select: {
              learningPathId: true,
              learningPath: { select: { title: true } },
            },
          },
        },
      },
      questions: { include: { options: true } },
    },
  })

  if (quizzes.length === 0) return []

  const quizIds = quizzes.map((q) => q.id)
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      userId: { in: userIds },
      quizId: { in: quizIds },
      ...(params?.learningPathId ? { learningPathId: params.learningPathId } : {}),
    },
    select: {
      quizId: true,
      percent: true,
      answers: true,
    },
  })

  const attemptsByQuiz = new Map<string, typeof attempts>()
  attempts.forEach((attempt) => {
    const list = attemptsByQuiz.get(attempt.quizId) ?? []
    list.push(attempt)
    attemptsByQuiz.set(attempt.quizId, list)
  })

  return quizzes.map((quiz) => {
    const quizAttempts = attemptsByQuiz.get(quiz.id) ?? []
    const attemptsCount = quizAttempts.length
    const avgScorePercent = attemptsCount
      ? Math.round(quizAttempts.reduce((sum, a) => sum + (a.percent ?? 0), 0) / attemptsCount)
      : 0
    const passRate = attemptsCount
      ? Math.round((quizAttempts.filter((a) => (a.percent ?? 0) >= PASS_THRESHOLD).length / attemptsCount) * 100)
      : 0

    const buckets = [
      { range: "0-49", count: 0 },
      { range: "50-69", count: 0 },
      { range: "70-89", count: 0 },
      { range: "90-100", count: 0 },
    ]

    quizAttempts.forEach((attempt) => {
      const percent = attempt.percent ?? 0
      if (percent < 50) buckets[0].count += 1
      else if (percent < 70) buckets[1].count += 1
      else if (percent < 90) buckets[2].count += 1
      else buckets[3].count += 1
    })

    const questionMap = new Map<
      string,
      { prompt: string; type: string; correctTextAnswer?: string | null; correctOptionIds: string[]; attempts: number; correct: number }
    >()

    quiz.questions.forEach((q) => {
      questionMap.set(q.id, {
        prompt: q.prompt,
        type: q.type,
        correctTextAnswer: q.correctTextAnswer ?? null,
        correctOptionIds: q.options.filter((o) => o.isCorrect).map((o) => o.id),
        attempts: 0,
        correct: 0,
      })
    })

    quizAttempts.forEach((attempt) => {
      const answers = Array.isArray(attempt.answers) ? (attempt.answers as QuizAnswerRecord[]) : []
      answers.forEach((answer) => {
        if (!answer.questionId) return
        const question = questionMap.get(answer.questionId)
        if (!question) return

        question.attempts += 1
        const type = answer.type ?? question.type

        if (type === "SHORT_TEXT" || type === "LONG_TEXT") {
          const expected = normalizeText(question.correctTextAnswer ?? "")
          const received = normalizeText(answer.textAnswer ?? "")
          if (expected && expected === received) question.correct += 1
          return
        }

        const selected = new Set(answer.optionIds ?? [])
        const correct = new Set(question.correctOptionIds)

        if (type === "SINGLE_CHOICE") {
          if (selected.size === 1 && correct.size === 1 && selected.has(Array.from(correct)[0])) {
            question.correct += 1
          }
          return
        }

        if (type === "MULTIPLE_CHOICE") {
          if (selected.size === correct.size && Array.from(correct).every((id) => selected.has(id))) {
            question.correct += 1
          }
        }
      })
    })

    const questionInsights: QuestionInsight[] = Array.from(questionMap.entries()).map(([id, info]) => {
      const accuracyPercent = info.attempts > 0 ? Math.round((info.correct / info.attempts) * 100) : 0
      const difficultyIndex = Number((1 - accuracyPercent / 100).toFixed(2))
      return {
        questionId: id,
        prompt: info.prompt,
        accuracyPercent,
        difficultyIndex,
        attempts: info.attempts,
      }
    })

    const withAttempts = questionInsights.filter((q) => q.attempts > 0)
    const hardestQuestions = [...withAttempts].sort((a, b) => a.accuracyPercent - b.accuracyPercent).slice(0, 4)
    const easiestQuestions = [...withAttempts].sort((a, b) => b.accuracyPercent - a.accuracyPercent).slice(0, 4)

    return {
      quizId: quiz.id,
      quizTitle: quiz.resource.title,
      learningPathId: quiz.resource.topic.learningPathId,
      learningPathTitle: quiz.resource.topic.learningPath.title,
      avgScorePercent,
      attemptsCount,
      passRate,
      scoreBuckets: buckets,
      hardestQuestions,
      easiestQuestions,
    }
  })
}

export async function getUserRiskInsights(params?: {
  companyId?: string
  partnerProfileId?: string
  learningPathId?: string
}): Promise<UserRiskInsight[]> {
  const users = await fetchScopedUsers(params)
  const userIds = users.map((u) => u.id)
  if (userIds.length === 0) return []

  const [videoProgresses, quizAttempts] = await Promise.all([
    prisma.videoProgress.findMany({
      where: {
        userId: { in: userIds },
        ...(params?.learningPathId ? { learningPathId: params.learningPathId } : {}),
      },
      select: {
        userId: true,
        learningPathId: true,
        maxPercentViewed: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.quizAttempt.findMany({
      where: {
        userId: { in: userIds },
        ...(params?.learningPathId ? { learningPathId: params.learningPathId } : {}),
      },
      select: {
        userId: true,
        learningPathId: true,
        percent: true,
        submittedAt: true,
      },
    }),
  ])

  const aggregateMap = new Map<string, UserPathAggregate>()
  const ensure = (userId: string, learningPathId: string) => {
    const key = `${userId}:${learningPathId}`
    const existing =
      aggregateMap.get(key) ??
      ({
        userId,
        learningPathId,
        sumProgress: 0,
        countProgress: 0,
        quizSum: 0,
        quizCount: 0,
      } as UserPathAggregate)
    aggregateMap.set(key, existing)
    return existing
  }

  videoProgresses.forEach((vp) => {
    const entry = ensure(vp.userId, vp.learningPathId)
    entry.sumProgress += vp.maxPercentViewed ?? 0
    entry.countProgress += 1
    entry.firstActivity = safeDateMin(entry.firstActivity, vp.createdAt)
    entry.lastVideoAt = safeDateMax(entry.lastVideoAt, vp.updatedAt)
  })

  quizAttempts.forEach((qa) => {
    const entry = ensure(qa.userId, qa.learningPathId)
    entry.firstActivity = safeDateMin(entry.firstActivity, qa.submittedAt)
    entry.lastQuizAt = safeDateMax(entry.lastQuizAt, qa.submittedAt)
    entry.quizSum = (entry.quizSum ?? 0) + (qa.percent ?? 0)
    entry.quizCount = (entry.quizCount ?? 0) + 1
  })

  const learningPathIds = new Set<string>([
    ...videoProgresses.map((vp) => vp.learningPathId),
    ...quizAttempts.map((qa) => qa.learningPathId),
  ])
  if (params?.learningPathId) learningPathIds.add(params.learningPathId)

  const learningPaths = await prisma.learningPath.findMany({
    where: { id: { in: Array.from(learningPathIds) } },
    select: { id: true, title: true },
  })
  const learningPathMap = new Map(learningPaths.map((lp) => [lp.id, lp.title]))
  const userMap = new Map(
    users.map((u) => [
      u.id,
      {
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        companyName: u.company?.name ?? undefined,
        partnerProfileName: u.partnerLinks.map((p) => p.partnerProfile.name).join(", ") || undefined,
      },
    ]),
  )

  const stats = groupUserPathStats(Array.from(aggregateMap.values()))
  const staleThreshold = subDays(new Date(), HIGH_RISK_DAYS)
  const riskOrder: Record<UserRiskInsight["riskLevel"], number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

  const insights = stats
    .map((stat): UserRiskInsight | null => {
      const userInfo = userMap.get(stat.userId)
      if (!userInfo || !stat.lastActivity) return null
      const lastActivityAt = stat.lastActivity
      const stale = lastActivityAt < staleThreshold
      const quizAvg = stat.quizAvgPercent ?? null

      let riskLevel: UserRiskInsight["riskLevel"] = "LOW"
      if (stale && (stat.avgProgress < 50 || (quizAvg !== null && quizAvg < 50))) {
        riskLevel = "HIGH"
      } else if (stale && stat.avgProgress >= 50 && stat.avgProgress < 80) {
        riskLevel = "MEDIUM"
      } else if (quizAvg !== null && quizAvg >= 50 && quizAvg < 70) {
        riskLevel = "MEDIUM"
      }

      return {
        userId: stat.userId,
        userName: userInfo.name,
        email: userInfo.email,
        companyName: userInfo.companyName,
        partnerProfileName: userInfo.partnerProfileName,
        learningPathId: stat.learningPathId,
        learningPathTitle: learningPathMap.get(stat.learningPathId) ?? "Trilha",
        lastActivityAt: lastActivityAt.toISOString(),
        avgProgress: stat.avgProgress,
        quizAvgPercent: quizAvg,
        riskLevel,
      }
    })
    .filter((item): item is UserRiskInsight => Boolean(item))
    .sort((a, b) => {
      const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
      if (riskDiff !== 0) return riskDiff
      return new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime()
    })

  return insights
}
