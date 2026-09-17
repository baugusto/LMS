import { EnrollmentStatus, ProgressStatus } from "@prisma/client"
import { prisma } from "../../db/prisma"
import { DashboardService } from "./dashboard.service"
import { EnrollmentsService } from "./enrollments.service"

export class TracksService {
  static async getDetail(trackId: string, userId: string, role: "ADMIN" | "PARTNER") {
    const lp = await prisma.learningPath.findUnique({
      where: { id: trackId },
      include: {
        partnerProfiles: { include: { partnerProfile: true } },
        partnerProfile: true,
        topics: {
          orderBy: { order: "asc" },
          include: {
            resources: { orderBy: { title: "asc" } },
          },
        },
      },
    })
    if (!lp) return { notFound: true }

    const profileIdsFromLp =
      lp.partnerProfiles.length > 0 ? lp.partnerProfiles.map((p) => p.partnerProfileId) : [lp.partnerProfileId]

    if (role !== "ADMIN") {
      const userProfiles = await DashboardService.getProfileIds(userId)
      const canAccess = userProfiles.some((id) => profileIdsFromLp.includes(id))
      if (!canAccess) return { forbidden: true }
    }

    const allResources = lp.topics.flatMap((t) => t.resources)
    const totalResources = allResources.length

    const progress = await prisma.progress.findMany({
      where: { userId, resourceId: { in: allResources.map((r) => r.id) } },
    })
    const videoProgress = await prisma.videoProgress.findMany({
      where: { userId, learningPathId: lp.id },
      orderBy: { updatedAt: "desc" },
      select: { resourceId: true, completed: true, currentTimeSec: true },
    })
    const completedCount = progress.filter((p) => p.status === ProgressStatus.COMPLETED).length
    const percentage = totalResources > 0 ? Math.round((completedCount / totalResources) * 100) : 0

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_learningPathId: { userId, learningPathId: lp.id } },
    })

    const lessonsProgress = progress.map((p) => ({
      lessonId: p.resourceId,
      status: p.status,
      completedAt: p.completedAt ?? undefined,
    }))

    const modules = lp.topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      order: topic.order,
      lessons: topic.resources.map((res) => ({
        id: res.id,
        title: res.title,
        description: res.description ?? "",
        order: 0,
        youtubeUrl: res.url,
        durationInMinutes: res.durationMinutes ?? undefined,
        type: res.type,
      })),
    }))

    const resourceIdSet = new Set(allResources.map((res) => res.id))
    const lastInProgressVideo = videoProgress.find(
      (vp) => resourceIdSet.has(vp.resourceId) && !vp.completed && vp.currentTimeSec > 0,
    )
    const firstIncompleteResourceId = allResources.find(
      (res) => !progress.some((p) => p.resourceId === res.id && p.status === ProgressStatus.COMPLETED),
    )?.id

    const currentLessonId =
      lastInProgressVideo?.resourceId ??
      enrollment?.status === EnrollmentStatus.COMPLETED
        ? allResources[0]?.id
        : firstIncompleteResourceId ?? allResources[0]?.id

    const materials = allResources.map((res) => ({
      id: res.id,
      title: res.title,
      type: res.type,
      url: res.url,
    }))

    return {
      track: {
        id: lp.id,
        title: lp.title,
        description: lp.description ?? "",
        partnershipProfiles: lp.partnerProfiles.length > 0 ? lp.partnerProfiles.map((p) => p.partnerProfile.name) : [lp.partnerProfile.name],
      },
      modules,
      materials,
      progress: {
        trackId: lp.id,
        status: enrollment?.status ?? EnrollmentStatus.NOT_STARTED,
        percentage,
        currentLessonId,
        lessons: lessonsProgress,
      },
    }
  }

  static async markLessonCompleted(trackId: string, lessonId: string, userId: string, role: "ADMIN" | "PARTNER") {
    const resource = await prisma.resource.findUnique({
      where: { id: lessonId },
      include: { topic: { select: { learningPathId: true, learningPath: { include: { partnerProfiles: true, partnerProfile: true } } } } },
    })
    if (!resource) return { notFound: true }
    if (resource.topic.learningPathId !== trackId) return { forbidden: true }

    if (role !== "ADMIN") {
      const userProfiles = await DashboardService.getProfileIds(userId)
      const lpProfiles = resource.topic.learningPath.partnerProfiles.length
        ? resource.topic.learningPath.partnerProfiles.map((p) => p.partnerProfileId)
        : [resource.topic.learningPath.partnerProfileId]
      const canAccess = userProfiles.some((id) => lpProfiles.includes(id))
      if (!canAccess) return { forbidden: true }
    }

    await EnrollmentsService.enroll(userId, trackId)
    await EnrollmentsService.completeResource(userId, lessonId)
    return this.getDetail(trackId, userId, role)
  }

  static async resetProgress(trackId: string, userId: string, role: "ADMIN" | "PARTNER") {
    const lp = await prisma.learningPath.findUnique({
      where: { id: trackId },
      include: { partnerProfiles: true, partnerProfile: true },
    })
    if (!lp) return { notFound: true }

    if (role !== "ADMIN") {
      const userProfiles = await DashboardService.getProfileIds(userId)
      const lpProfiles = lp.partnerProfiles.length
        ? lp.partnerProfiles.map((p) => p.partnerProfileId)
        : [lp.partnerProfileId]
      const canAccess = userProfiles.some((id) => lpProfiles.includes(id))
      if (!canAccess) return { forbidden: true }
    }

    await EnrollmentsService.resetLearningPathProgress(userId, trackId)
    return { ok: true }
  }
}
