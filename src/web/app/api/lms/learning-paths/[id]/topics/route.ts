import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { LearningPathsService } from "@/server/lms/services/learningPaths.service"
import { topicSchema } from "@/server/lms/validation/learningPaths.schema"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const parsed = topicSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  const topic = await LearningPathsService.createTopic(id, parsed.data)
  return NextResponse.json(topic, { status: 201 })
}
