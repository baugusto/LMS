import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { LearningPathsService } from "@/server/lms/services/learningPaths.service"
import { resourceUpdateSchema } from "@/server/lms/validation/learningPaths.schema"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const { resourceId } = await params
  const body = await req.json()
  const parsed = resourceUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  const resource = await LearningPathsService.updateResource(resourceId, parsed.data)
  return NextResponse.json(resource)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const { resourceId } = await params
  await LearningPathsService.deleteResource(resourceId)
  return NextResponse.json({ ok: true })
}
