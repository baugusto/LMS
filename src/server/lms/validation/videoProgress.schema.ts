import { z } from "zod"

export const VideoProgressQuerySchema = z.object({
  learningPathId: z.string().min(1),
  resourceId: z.string().min(1),
})

export const VideoProgressUpdateSchema = z.object({
  learningPathId: z.string().min(1),
  resourceId: z.string().min(1),
  currentTimeSec: z.number().int().min(0),
  durationSec: z.number().int().min(0).optional(),
  percent: z.number().min(0).max(100),
})
