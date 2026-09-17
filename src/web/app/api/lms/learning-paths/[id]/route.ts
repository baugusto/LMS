import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { LearningPathsService } from "@/server/lms/services/learningPaths.service"
import { UpdateLearningPathSchema } from "@/server/lms/validation/learningPaths.schema"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const lp = await LearningPathsService.getLearningPathById(id)
    if (!lp) return NextResponse.json({ error: "Trilha não encontrada" }, { status: 404 })
    return NextResponse.json(lp)
  } catch (err) {
    console.error("Erro ao buscar trilha", err)
    return NextResponse.json({ error: "Erro interno ao buscar trilha" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const body = await req.json()
    const parsed = UpdateLearningPathSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.format() }, { status: 400 })

    const lp = await LearningPathsService.updateLearningPath(id, parsed.data)
    return NextResponse.json(lp)
  } catch (err) {
    console.error("Erro ao atualizar trilha", err)
    return NextResponse.json({ error: "Erro interno ao atualizar trilha" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    await LearningPathsService.deleteLearningPath(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Erro ao remover trilha", err)
    return NextResponse.json({ error: "Erro interno ao remover trilha" }, { status: 500 })
  }
}
