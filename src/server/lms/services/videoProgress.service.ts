import { prisma } from "../../db/prisma"

export type VideoProgressUpsertInput = {
  userId: string
  learningPathId: string
  resourceId: string
  currentTimeSec: number
  durationSec?: number | null
  percent: number
}

export async function getVideoProgress(params: { userId: string; resourceId: string }) {
  return prisma.videoProgress.findUnique({
    where: { userId_resourceId: { userId: params.userId, resourceId: params.resourceId } },
  })
}

export async function upsertVideoProgress(input: VideoProgressUpsertInput) {
  const existing = await prisma.videoProgress.findUnique({
    where: { userId_resourceId: { userId: input.userId, resourceId: input.resourceId } },
  })

  const nextPercent = Math.min(100, Math.max(0, Math.round(input.percent)))
  const maxPercentViewed = Math.max(existing?.maxPercentViewed ?? 0, nextPercent)
  const completed = maxPercentViewed >= 90

  const updated = await prisma.videoProgress.upsert({
    where: { userId_resourceId: { userId: input.userId, resourceId: input.resourceId } },
    update: {
      currentTimeSec: Math.max(0, Math.round(input.currentTimeSec)),
      durationSec: input.durationSec ?? existing?.durationSec ?? null,
      maxPercentViewed,
      completed,
      learningPathId: input.learningPathId,
    },
    create: {
      userId: input.userId,
      learningPathId: input.learningPathId,
      resourceId: input.resourceId,
      currentTimeSec: Math.max(0, Math.round(input.currentTimeSec)),
      durationSec: input.durationSec ?? null,
      maxPercentViewed,
      completed,
    },
  })

  return updated
}
