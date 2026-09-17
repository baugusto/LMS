import { prisma } from "../../db/prisma"

type VideoEventInput = {
  userId: string
  trackId: string
  lessonId: string
  eventType: string
  position: number
  duration?: number | null
}

export class VideoAnalyticsService {
  static async logVideoEvent(data: VideoEventInput) {
    return prisma.videoViewEvent.create({
      data: {
        userId: data.userId,
        trackId: data.trackId,
        lessonId: data.lessonId,
        eventType: data.eventType,
        position: data.position,
        duration: data.duration ?? null,
      },
    })
  }
}

// Aliás de import legado
export default VideoAnalyticsService
