import { EnrollmentStatus, ProgressStatus } from "@prisma/client"
import { prisma } from "../../db/prisma"

export class EnrollmentsService {
  static async enroll(userId: string, learningPathId: string) {
    return prisma.enrollment.upsert({
      where: { userId_learningPathId: { userId, learningPathId } },
      update: { status: EnrollmentStatus.IN_PROGRESS, startedAt: new Date() },
      create: { userId, learningPathId, status: EnrollmentStatus.IN_PROGRESS, startedAt: new Date() },
    })
  }

  static async completeResource(userId: string, resourceId: string) {
    await prisma.progress.upsert({
      where: { userId_resourceId: { userId, resourceId } },
      update: { status: ProgressStatus.COMPLETED, completedAt: new Date(), lastViewedAt: new Date() },
      create: { userId, resourceId, status: ProgressStatus.COMPLETED, completedAt: new Date(), lastViewedAt: new Date() },
    })

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: { topic: { select: { learningPathId: true } } },
    })
    if (!resource) return
    const learningPathId = resource.topic.learningPathId

    const total = await prisma.resource.count({ where: { topic: { learningPathId } } })
    const completed = await prisma.progress.count({
      where: { userId, status: ProgressStatus.COMPLETED, resource: { topic: { learningPathId } } },
    })
    const status = completed >= total && total > 0 ? EnrollmentStatus.COMPLETED : EnrollmentStatus.IN_PROGRESS

    await prisma.enrollment.upsert({
      where: { userId_learningPathId: { userId, learningPathId } },
      update: { status, completedAt: status === EnrollmentStatus.COMPLETED ? new Date() : null },
      create: { userId, learningPathId, status, startedAt: new Date(), completedAt: status === EnrollmentStatus.COMPLETED ? new Date() : null },
    })

    return { total, completed, status }
  }

  static async resetLearningPathProgress(userId: string, learningPathId: string) {
    await prisma.$transaction([
      prisma.videoProgress.deleteMany({ where: { userId, learningPathId } }),
      prisma.progress.deleteMany({ where: { userId, resource: { topic: { learningPathId } } } }),
      prisma.quizAttempt.deleteMany({ where: { userId, learningPathId } }),
      prisma.enrollment.deleteMany({ where: { userId, learningPathId } }),
    ])
    return { ok: true }
  }
}
