import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { DashboardService } from "@/server/lms/services/dashboard.service"

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ message: "Não autenticado" }, { status: 401 })

  const data = await DashboardService.buildDashboard(user.id, user.role)
  return NextResponse.json(data)
}
