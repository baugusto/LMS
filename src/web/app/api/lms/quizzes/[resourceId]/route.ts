import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/server/auth/better-auth"
import { QuizAnswerSchema, QuizSubmissionSchema, getQuizForUser, gradeQuizAttempt } from "@/server/lms/services/quiz.service"

const submissionSchema = z.object({
  quizId: z.string().min(1),
  answers: z.array(QuizAnswerSchema).min(1).max(20),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { resourceId } = await params
    const quiz = await getQuizForUser(resourceId, user.id)
    if (!quiz) return NextResponse.json({ error: "Quiz não encontrado" }, { status: 404 })
    if ((quiz as any).forbidden) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    return NextResponse.json(quiz)
  } catch (err) {
    console.error("Erro ao carregar quiz", err)
    return NextResponse.json({ error: "Erro ao carregar quiz" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { resourceId } = await params
    const body = await req.json()
    const parsed = submissionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.format() }, { status: 400 })
    }
    const result = await gradeQuizAttempt(
      QuizSubmissionSchema.parse({ ...parsed.data, resourceId }),
      user.id,
      user.role,
    )
    if ((result as any).forbidden) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    if ((result as any).alreadySubmitted) {
      return NextResponse.json(
        { error: "Você já respondeu este quiz. Reinicie a trilha para tentar novamente." },
        { status: 409 },
      )
    }
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error("Erro ao enviar quiz", err)
    return NextResponse.json({ error: "Erro ao enviar quiz" }, { status: 500 })
  }
}
