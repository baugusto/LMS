import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/server/auth/better-auth"
import { TracksService } from "@/server/lms/services/tracks.service"

const progressSchema = z.object({
  lessonId: z.string().min(1),
  status: z.literal("COMPLETED"),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const parsed = progressSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.format() }, { status: 400 })

    const updated = await TracksService.markLessonCompleted(id, parsed.data.lessonId, user.id, user.role)
    if ((updated as any).notFound) return NextResponse.json({ error: "Trilha ou aula não encontrada" }, { status: 404 })
    if ((updated as any).forbidden) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    return NextResponse.json(updated)
  } catch (err) {
    console.error("Erro ao atualizar progresso", err)
    return NextResponse.json({ error: "Erro interno ao atualizar progresso" }, { status: 500 })
  }
}
