import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/server/auth/better-auth"
import { CompaniesService } from "@/server/lms/services/companies.service"
import { companySchema } from "@/server/lms/validation/companies.schema"

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const data = await CompaniesService.list()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const body = await req.json()
  const parsed = companySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  try {
    const created = await CompaniesService.create(parsed.data)
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Erro ao criar empresa" }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const body = await req.json()
  const parsed = companySchema.extend({ id: z.string().min(1) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  try {
    const updated = await CompaniesService.update(parsed.data.id, parsed.data)
    return NextResponse.json(updated, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Erro ao atualizar empresa" }, { status: 400 })
  }
}
