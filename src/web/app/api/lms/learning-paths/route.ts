import { NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { LearningPathsService } from "@/server/lms/services/learningPaths.service"
import { CreateLearningPathSchema } from "@/server/lms/validation/learningPaths.schema"

import type { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const data = await LearningPathsService.listLearningPathsAdmin()
    return NextResponse.json(data)
  } catch (err) {
    console.error("Erro ao listar trilhas", err)
    return NextResponse.json({ error: "Erro interno ao listar trilhas" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const body = await req.json()
    const parsed = CreateLearningPathSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.format() }, { status: 400 })
    }

    const lp = await LearningPathsService.createLearningPath(parsed.data)
    return NextResponse.json(lp, { status: 201 })
  } catch (err) {
    console.error("Erro ao criar trilha", err)
    return NextResponse.json({ error: "Erro interno ao criar trilha" }, { status: 500 })
  }
}
