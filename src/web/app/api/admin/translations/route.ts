import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { defaultLocale, locales, type Locale } from "@/i18n/config"
import { getDictionary } from "@/i18n/getDictionary"
import { flattenMessages } from "@/i18n/flattenMessages"
import { deleteTranslation, getLocaleOverrides, upsertTranslation } from "@/server/i18n/translation.service"
import { getSessionUser } from "@/server/auth/better-auth"

const localeSchema = z.enum(locales)
const upsertSchema = z.object({
  locale: localeSchema,
  key: z.string().trim().min(1).max(200),
  value: z.string().trim().min(1).max(2000),
})
const deleteSchema = z.object({
  locale: localeSchema,
  key: z.string().trim().min(1).max(200),
})

function ensureAdmin(user: any) {
  return user && user.role === "ADMIN"
}

function buildResponse(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!ensureAdmin(user)) return buildResponse({ message: "Acesso negado" }, 403)

  const { searchParams } = new URL(req.url)
  const localeParam = searchParams.get("locale") ?? defaultLocale
  const search = searchParams.get("search")?.toLowerCase()
  const localeParsed = localeSchema.safeParse(localeParam)
  if (!localeParsed.success) return buildResponse({ message: "Locale inválido" }, 400)
  const locale = localeParsed.data as Locale

  try {
    const baseMessages = await getDictionary(locale)
    const baseFlat = flattenMessages(baseMessages)
    const overrides = await getLocaleOverrides(locale)

    const keys = new Set([...Object.keys(baseFlat), ...Object.keys(overrides)])
    let list = Array.from(keys).map((key) => ({
      key,
      baseValue: baseFlat[key] ?? null,
      overrideValue: overrides[key] ?? null,
    }))

    if (search) {
      list = list.filter(
        (item) =>
          item.key.toLowerCase().includes(search) ||
          item.baseValue?.toLowerCase().includes(search) ||
          item.overrideValue?.toLowerCase().includes(search),
      )
    }

    return buildResponse(list)
  } catch (error) {
    console.error("Erro ao listar traduções", error)
    return buildResponse([], 200)
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!ensureAdmin(user)) return buildResponse({ message: "Acesso negado" }, 403)
  const json = await req.json()
  const parsed = upsertSchema.safeParse(json)
  if (!parsed.success) return buildResponse({ message: "Dados inválidos" }, 400)

  try {
    await upsertTranslation(parsed.data)
    return buildResponse({ ok: true })
  } catch (error) {
    console.error("Erro ao salvar tradução", error)
    return buildResponse({ message: "Erro ao salvar tradução" }, 500)
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!ensureAdmin(user)) return buildResponse({ message: "Acesso negado" }, 403)
  const json = await req.json()
  const parsed = deleteSchema.safeParse(json)
  if (!parsed.success) return buildResponse({ message: "Dados inválidos" }, 400)

  try {
    await deleteTranslation(parsed.data)
    return buildResponse({ ok: true })
  } catch (error) {
    console.error("Erro ao apagar tradução", error)
    return buildResponse({ message: "Erro ao apagar tradução" }, 500)
  }
}
