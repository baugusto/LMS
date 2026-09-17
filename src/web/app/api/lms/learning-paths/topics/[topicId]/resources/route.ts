import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { LearningPathsService } from "@/server/lms/services/learningPaths.service"
import { resourceSchema } from "@/server/lms/validation/learningPaths.schema"

export async function POST(req: NextRequest, { params }: { params: Promise<{ topicId: string }> }) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const { topicId } = await params
  const body = await req.json()
  const parsed = resourceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  const resource = await LearningPathsService.createResource(topicId, parsed.data)
  return NextResponse.json(resource, { status: 201 })
}
