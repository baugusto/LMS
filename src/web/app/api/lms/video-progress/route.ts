import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { VideoProgressQuerySchema, VideoProgressUpdateSchema } from "@/server/lms/validation/videoProgress.schema"
import { getVideoProgress, upsertVideoProgress } from "@/server/lms/services/videoProgress.service"
import { DashboardService } from "@/server/lms/services/dashboard.service"
import { ResourceType } from "@prisma/client"
import { getSessionUser } from "@/server/auth/better-auth"
import { EnrollmentsService } from "@/server/lms/services/enrollments.service"

async function userCanAccess(userId: string, learningPathId: string, role: string) {
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

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req)
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const userId = session.id

    const parsedQuery = VideoProgressQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!parsedQuery.success) return NextResponse.json({ error: "Parâmetros inválidos", details: parsedQuery.error.format() }, { status: 400 })
    const { learningPathId, resourceId } = parsedQuery.data

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: { topic: { select: { learningPathId: true } } },
    })
    if (!resource || resource.topic.learningPathId !== learningPathId) {
      return NextResponse.json({ error: "Recurso inválido" }, { status: 400 })
    }
    if (resource.type !== ResourceType.VIDEO) {
      return NextResponse.json({ currentTimeSec: 0, durationSec: null, maxPercentViewed: 0, completed: false })
    }

    const allowed = await userCanAccess(userId, learningPathId, session.role)
    if (!allowed) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const progress = await getVideoProgress({ userId, resourceId })
    if (!progress) {
      return NextResponse.json({ currentTimeSec: 0, durationSec: null, maxPercentViewed: 0, completed: false })
    }
    return NextResponse.json(progress)
  } catch (err) {
    console.error("Erro ao buscar progresso de vídeo", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req)
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const userId = session.id

    const body = await req.json()
    const parsed = VideoProgressUpdateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.format() }, { status: 400 })
    const { learningPathId, resourceId, currentTimeSec, durationSec, percent } = parsed.data

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: { topic: { select: { learningPathId: true } } },
    })
    if (!resource || resource.topic.learningPathId !== learningPathId) {
      return NextResponse.json({ error: "Recurso inválido" }, { status: 400 })
    }
    if (resource.type !== ResourceType.VIDEO) {
      // Ignora progresso para recursos que não são vídeo
      return NextResponse.json({ success: true, ignored: true })
    }

    const allowed = await userCanAccess(userId, learningPathId, session.role)
    if (!allowed) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const result = await upsertVideoProgress({
      userId,
      learningPathId,
      resourceId,
      currentTimeSec,
      durationSec,
      percent,
    })

    if (result.completed) {
      // Marca também o progresso "oficial" para refletir no dashboard
      await EnrollmentsService.completeResource(userId, resourceId)
    }

    return NextResponse.json({ success: true, maxPercentViewed: result.maxPercentViewed, completed: result.completed, currentTimeSec: result.currentTimeSec, durationSec: result.durationSec })
  } catch (err) {
    console.error("Erro ao salvar progresso de vídeo", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
