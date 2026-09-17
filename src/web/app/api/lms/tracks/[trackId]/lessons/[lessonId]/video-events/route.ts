import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/server/auth/better-auth"
import { VideoAnalyticsService } from "@/server/lms/services/videoAnalytics.service"
import { TracksService } from "@/server/lms/services/tracks.service"

const bodySchema = z.object({
  eventType: z.enum(["play", "pause", "progress", "ended", "error"]),
  position: z.number().int().min(0),
  duration: z.number().int().min(0).optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ trackId: string; lessonId: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const { trackId, lessonId } = await params
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.format() }, { status: 400 })

    const detail = await TracksService.getDetail(trackId, user.id, user.role)
    if ((detail as any)?.notFound) return NextResponse.json({ error: "Trilha não encontrada" }, { status: 404 })
    if ((detail as any)?.forbidden) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const lessons = detail?.modules?.flatMap((m: any) => m.lessons) ?? []
    const existsLesson = lessons.some((l: any) => l.id === lessonId)
    if (!existsLesson) return NextResponse.json({ error: "Aula não encontrada na trilha" }, { status: 404 })

    await VideoAnalyticsService.logVideoEvent({
      userId: user.id,
      trackId,
      lessonId,
      eventType: parsed.data.eventType,
      position: parsed.data.position,
      duration: parsed.data.duration,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Erro ao registrar evento de vídeo", err)
    return NextResponse.json({ error: "Erro interno ao registrar evento" }, { status: 500 })
  }
}
