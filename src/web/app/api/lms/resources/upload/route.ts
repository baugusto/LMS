import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/server/auth/better-auth"
import { mkdir, unlink } from "fs/promises"
import { createWriteStream } from "fs"
import { Readable } from "stream"
import path from "path"
import { randomUUID } from "crypto"
import Busboy from "busboy"

export const runtime = "nodejs"

const extensionByType: Record<string, string[]> = {
  DOC: [".doc", ".docx", ".pdf"],
  PDF: [".pdf"],
  SLIDE: [".ppt", ".pptx", ".pdf"],
  SHEET: [".xls", ".xlsx", ".csv"],
  IMAGE: [".png", ".jpg", ".jpeg", ".webp", ".gif"],
}

const sanitizeFileName = (name: string) => {
  const normalized = name.normalize("NFKD").replace(/[^\x00-\x7F]/g, "")
  const replaced = normalized.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-")
  const trimmed = replaced.replace(/^-+|-+$/g, "")
  return trimmed || "arquivo"
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const contentType = req.headers.get("content-type")
  if (!contentType?.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Content-Type inválido" }, { status: 400 })
  }
  if (!req.body) {
    return NextResponse.json({ error: "Requisição sem corpo" }, { status: 400 })
  }

  const storageDir = path.join(process.cwd(), "storage", "resources")
  await mkdir(storageDir, { recursive: true })

  const maxUploadBytes = 1024 * 1024 * 1024
  const busboy = Busboy({
    headers: { "content-type": contentType },
    limits: { files: 1, fileSize: maxUploadBytes, fields: 10 },
  })

  let resourceType = ""
  let fileMeta: { fileKey: string; filePath: string; fileName: string; extension: string } | null = null
  let fileWritePromise: Promise<void> | null = null
  let fileTooLarge = false

  busboy.on("field", (name, value) => {
    if (name === "type") {
      resourceType = value.trim().toUpperCase()
    }
  })

  busboy.on("file", (name, file, info) => {
    if (name !== "file") {
      file.resume()
      return
    }
    const sanitizedName = sanitizeFileName(info.filename || "arquivo")
    const extension = path.extname(sanitizedName).toLowerCase()
    const fileKey = `${randomUUID()}-${sanitizedName}`
    const filePath = path.join(storageDir, fileKey)
    fileMeta = { fileKey, filePath, fileName: sanitizedName, extension }

    file.on("limit", () => {
      fileTooLarge = true
    })

    const writer = createWriteStream(filePath)
    file.pipe(writer)

    fileWritePromise = new Promise<void>((resolve, reject) => {
      writer.on("finish", resolve)
      writer.on("error", reject)
      file.on("error", reject)
    })
  })

  try {
    const stream = Readable.fromWeb(req.body as any)
    await new Promise<void>((resolve, reject) => {
      busboy.on("finish", resolve)
      busboy.on("error", reject)
      stream.on("error", reject)
      stream.pipe(busboy)
    })
  } catch (error) {
    console.error("Erro ao processar upload", error)
    return NextResponse.json({ error: "Falha ao processar upload" }, { status: 500 })
  }

  if (!fileMeta) {
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })
  }
  const safeMeta = fileMeta as { fileKey: string; filePath: string; fileName: string; extension: string }
  if (fileTooLarge) {
    await unlink(safeMeta.filePath).catch(() => null)
    return NextResponse.json({ error: "Arquivo excede o tamanho permitido" }, { status: 413 })
  }
  if (!resourceType || !extensionByType[resourceType]) {
    await unlink(safeMeta.filePath).catch(() => null)
    return NextResponse.json({ error: "Tipo de recurso inválido" }, { status: 400 })
  }
  if (!extensionByType[resourceType].includes(safeMeta.extension)) {
    await unlink(safeMeta.filePath).catch(() => null)
    return NextResponse.json({ error: "Extensão não permitida para este tipo de recurso" }, { status: 400 })
  }

  try {
    if (fileWritePromise) {
      await fileWritePromise
    }
  } catch (error) {
    console.error("Erro ao salvar arquivo", error)
    await unlink(safeMeta.filePath).catch(() => null)
    return NextResponse.json({ error: "Falha ao salvar arquivo" }, { status: 500 })
  }

  const url = `/api/lms/resources/download/${safeMeta.fileKey}`
  return NextResponse.json({ url, fileName: safeMeta.fileName })
}
