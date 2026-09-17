import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { TracksService } from "@/server/lms/services/tracks.service"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const { id } = await params
    const detail = await TracksService.getDetail(id, user.id, user.role)
    if ((detail as any).notFound) return NextResponse.json({ error: "Trilha não encontrada" }, { status: 404 })
    if ((detail as any).forbidden) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    return NextResponse.json(detail)
  } catch (err) {
    console.error("Erro ao buscar trilha", err)
    return NextResponse.json({ error: "Erro interno ao buscar trilha" }, { status: 500 })
  }
}
