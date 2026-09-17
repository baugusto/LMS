import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { UsersService } from "@/server/lms/services/users.service"
import { userUpdateSchema } from "@/server/lms/validation/users.schema"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const parsed = userUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  const updated = await UsersService.update(id, parsed.data as any)
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const { id } = await params
  await UsersService.remove(id)
  return NextResponse.json({ ok: true })
}
