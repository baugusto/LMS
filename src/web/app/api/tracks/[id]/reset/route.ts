import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { TracksService } from "@/server/lms/services/tracks.service"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const { id } = await params
    const result = await TracksService.resetProgress(id, user.id, user.role)
    if ((result as any).notFound) return NextResponse.json({ error: "Trilha não encontrada" }, { status: 404 })
    if ((result as any).forbidden) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Erro ao reiniciar trilha", err)
    return NextResponse.json({ error: "Erro ao reiniciar trilha" }, { status: 500 })
  }
}
