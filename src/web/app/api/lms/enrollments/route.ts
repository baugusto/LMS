import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { EnrollmentsService } from "@/server/lms/services/enrollments.service"
import { z } from "zod"

const enrollSchema = z.object({
  learningPathId: z.string(),
})

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  const body = await req.json()
  const parsed = enrollSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  const enrollment = await EnrollmentsService.enroll(user.id, parsed.data.learningPathId)
  return NextResponse.json(enrollment)
}
