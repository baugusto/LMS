import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { UsersService } from "@/server/lms/services/users.service"
import { userBulkDeleteSchema, userBulkUpdateSchema, userCreateSchema } from "@/server/lms/validation/users.schema"

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const data = await UsersService.list()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const body = await req.json()
  const parsed = userCreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  try {
    const created = await UsersService.create(parsed.data)
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    const message = e?.code === "P2003" ? "Empresa inválida" : e.message ?? "Erro ao criar"
    return NextResponse.json({ message }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const body = await req.json()
  const parsed = userBulkUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  try {
    if (parsed.data.action === "company") {
      const updated = await UsersService.assignCompanyMany(parsed.data.ids, parsed.data.companyId ?? null)
      return NextResponse.json({ ok: true, updated })
    }
    const updated = await UsersService.addPartnerProfilesMany(parsed.data.ids, parsed.data.partnerProfileIds)
    return NextResponse.json({ ok: true, updated })
  } catch (e: any) {
    const message = e?.code === "P2003" ? "Empresa ou perfil inválido" : e.message ?? "Erro ao atualizar"
    return NextResponse.json({ message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const body = await req.json()
  const parsed = userBulkDeleteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  await UsersService.removeMany(parsed.data.ids)
  return NextResponse.json({ ok: true })
}
