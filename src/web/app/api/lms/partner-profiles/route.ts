import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { PartnerProfilesService } from "@/server/lms/services/partnerProfiles.service"
import { z } from "zod"

const profileSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  active: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const data = await PartnerProfilesService.list()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const body = await req.json()
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  const created = await PartnerProfilesService.create(parsed.data)
  return NextResponse.json(created, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const body = await req.json()
  const parsed = profileSchema.extend({ id: z.string() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  const updated = await PartnerProfilesService.update(parsed.data.id, parsed.data)
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "ADMIN") return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  const body = await req.json()
  const parsed = z.object({ id: z.string() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  const updated = await PartnerProfilesService.remove(parsed.data.id)
  return NextResponse.json(updated)
}
