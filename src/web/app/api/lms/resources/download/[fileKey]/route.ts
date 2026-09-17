import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { prisma } from "@/server/db/prisma"
import { DashboardService } from "@/server/lms/services/dashboard.service"
import { createReadStream } from "fs"
import { stat } from "fs/promises"
import path from "path"
import { Readable } from "stream"

export const runtime = "nodejs"

const mimeByExtension: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
}

const fileNameFromKey = (fileKey: string) => {
  const withUuidPrefix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i
  if (withUuidPrefix.test(fileKey)) {
    return fileKey.replace(withUuidPrefix, "")
  }
  return fileKey
}

const userCanAccess = async (userId: string, role: string, learningPathId: string) => {
  if (role === "ADMIN") return true
  const profileIds = await DashboardService.getProfileIds(userId)
  const lp = await prisma.learningPath.findUnique({
    where: { id: learningPathId },
    include: { partnerProfiles: true, partnerProfile: true },
  })
  if (!lp) return false
  const lpProfiles = lp.partnerProfiles.length ? lp.partnerProfiles.map((p) => p.partnerProfileId) : [lp.partnerProfileId]
  return lpProfiles.some((pid) => profileIds.includes(pid))
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ fileKey: string }> }) {
  const session = await getSessionUser(req)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { fileKey } = await params
  if (!fileKey || fileKey.includes("..")) {
    return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 })
  }

  const url = `/api/lms/resources/download/${fileKey}`
  const resource = await prisma.resource.findFirst({
    where: { url },
    include: { topic: { select: { learningPathId: true } } },
  })
  if (!resource) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 })

  const allowed = await userCanAccess(session.id, session.role, resource.topic.learningPathId)
  if (!allowed) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const storagePath = path.join(process.cwd(), "storage", "resources", fileKey)
  let fileStat
  try {
    fileStat = await stat(storagePath)
  } catch (error) {
    console.error("Arquivo ausente", error)
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 })
  }

  const extension = path.extname(fileKey).toLowerCase()
  const contentType = mimeByExtension[extension] ?? "application/octet-stream"
  const fileName = fileNameFromKey(fileKey)
  const headers = new Headers()
  headers.set("Content-Type", contentType)
  headers.set("Content-Length", fileStat.size.toString())
  headers.set("Content-Disposition", `attachment; filename="${fileName}"`)
  headers.set("Cache-Control", "private, no-store")

  const stream = createReadStream(storagePath)
  return new NextResponse(Readable.toWeb(stream) as any, { headers })
}
