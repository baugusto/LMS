import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { LearningPathsService } from "@/server/lms/services/learningPaths.service"
import { topicSchema } from "@/server/lms/validation/learningPaths.schema"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ topicId: string }> }) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const { topicId } = await params
  const body = await req.json()
  const parsed = topicSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  const topic = await LearningPathsService.updateTopic(topicId, parsed.data)
  return NextResponse.json(topic)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ topicId: string }> }) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const { topicId } = await params
  await LearningPathsService.deleteTopic(topicId)
  return NextResponse.json({ ok: true })
}
