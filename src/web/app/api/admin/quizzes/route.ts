import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { QuizDefinitionSchema, createOrUpdateQuiz, getQuizForAdmin } from "@/server/lms/services/quiz.service"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const resourceId = req.nextUrl.searchParams.get("resourceId")
    if (!resourceId) return NextResponse.json({ error: "resourceId é obrigatório" }, { status: 400 })

    const quiz = await getQuizForAdmin(resourceId, user.id)
    if (!quiz) return NextResponse.json({ error: "Quiz não encontrado" }, { status: 404 })
    return NextResponse.json(quiz)
  } catch (err) {
    console.error("Erro ao buscar quiz", err)
    return NextResponse.json({ error: "Erro ao buscar quiz" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const body = await req.json()
    const parsed = QuizDefinitionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.format() }, { status: 400 })
    }

    const quiz = await createOrUpdateQuiz(parsed.data, user.id)
    return NextResponse.json(quiz)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao salvar quiz"
    console.error("Erro ao salvar quiz", err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
