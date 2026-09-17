import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/server/auth/better-auth"
import { getQuizInsights } from "@/server/lms/services/reports.insights.service"

const QuerySchema = z.object({
  companyId: z.string().min(1).optional(),
  partnerProfileId: z.string().min(1).optional(),
  learningPathId: z.string().min(1).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const parsed = QuerySchema.safeParse({
      companyId: req.nextUrl.searchParams.get("companyId") ?? undefined,
      partnerProfileId: req.nextUrl.searchParams.get("partnerProfileId") ?? undefined,
      learningPathId: req.nextUrl.searchParams.get("learningPathId") ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: "Parametros invalidos", details: parsed.error.format() }, { status: 400 })
    }

    const insights = await getQuizInsights(parsed.data)
    return NextResponse.json(insights)
  } catch (err) {
    console.error("Erro ao gerar insights de quizzes", err)
    return NextResponse.json({ error: "Erro ao gerar insights" }, { status: 500 })
  }
}
