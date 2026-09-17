import { EnrollmentStatus, ProgressStatus } from "@prisma/client"
import { prisma } from "../../db/prisma"

export class DashboardService {
  static async getProfileIds(userId: string) {
    const links = await prisma.userPartnerProfile.findMany({ where: { userId }, select: { partnerProfileId: true } })
    return links.map((l) => l.partnerProfileId)
  }

  static async getLearningPaths(userId: string, role: "ADMIN" | "PARTNER") {
    const profileIds = role === "ADMIN" ? undefined : await this.getProfileIds(userId)
    const where = role === "ADMIN" ? {} : { partnerProfileId: { in: profileIds }, active: true }
    return prisma.learningPath.findMany({
      where,
      include: { partnerProfile: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    })
  }

  static async buildDashboard(userId: string, role: "ADMIN" | "PARTNER") {
    const learningPaths = await this.getLearningPaths(userId, role)
    const lpIds = learningPaths.map((lp) => lp.id)

    const resources = await prisma.resource.findMany({
      where: { topic: { learningPathId: { in: lpIds } } },
      include: { topic: { select: { learningPathId: true } } },
    })
    const totalByPath: Record<string, number> = {}
    resources.forEach((r) => {
      totalByPath[r.topic.learningPathId] = (totalByPath[r.topic.learningPathId] ?? 0) + 1
    })

    const progress = await prisma.progress.findMany({
      where: { userId, resource: { topic: { learningPathId: { in: lpIds } } } },
      include: { resource: { select: { topic: { select: { learningPathId: true } } } } },
    })
    const videoProgress = await prisma.videoProgress.findMany({
      where: { userId, learningPathId: { in: lpIds } },
    })
    const videoPercentMap: Record<string, number> = {}
    videoProgress.forEach((vp) => {
      videoPercentMap[vp.resourceId] = vp.maxPercentViewed ?? 0
    })
    const completedProgressIds = new Set(
      progress.filter((p) => p.status === ProgressStatus.COMPLETED).map((p) => p.resourceId),
    )

    const completedByPath: Record<string, number> = {}
    const percentSumByPath: Record<string, number> = {}
    resources.forEach((r) => {
      const lpId = r.topic.learningPathId
      const percent = r.type === "VIDEO" ? videoPercentMap[r.id] ?? 0 : completedProgressIds.has(r.id) ? 100 : 0
      percentSumByPath[lpId] = (percentSumByPath[lpId] ?? 0) + percent
      if (percent >= 90) {
        completedByPath[lpId] = (completedByPath[lpId] ?? 0) + 1
      }
    })

    const enrollments = await prisma.enrollment.findMany({
      where: { userId, learningPathId: { in: lpIds } },
    })

    const mapped = learningPaths.map((lp) => {
      const total = totalByPath[lp.id] ?? 0
      const completed = completedByPath[lp.id] ?? 0
      const percentSum = percentSumByPath[lp.id] ?? 0
      const percent = total > 0 ? Math.round(percentSum / total) : 0
      const enrollment = enrollments.find((e) => e.learningPathId === lp.id)
      const status =
        percent >= 100
          ? "Finalizado"
          : percent > 0
            ? "Em Progresso"
            : "Não Iniciado"
      return {
        id: lp.id,
        title: lp.title,
        description: lp.description,
        partnerProfile: lp.partnerProfile,
        progressPercent: percent,
        status,
        resourcesCompleted: completed,
        resourcesTotal: total,
      }
    })

    return {
      recentLearningPaths: mapped.slice(0, 3),
      myLearningPaths: mapped,
      progressSummary: mapped.slice(0, 4),
    }
  }
}
