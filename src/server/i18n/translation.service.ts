import { prisma } from "@/server/db/prisma"
import type { Locale } from "@/i18n/config"

function shouldUseTranslationDb() {
  if (process.env.DISABLE_TRANSLATION_DB === "true") return false
  return Boolean(process.env.DATABASE_URL)
}

let hasWarnedTranslationDb = false

export async function getLocaleOverrides(locale: Locale) {
  if (!shouldUseTranslationDb()) {
    return {}
  }
  try {
    const rows = await prisma.translation.findMany({
      where: { localeId: locale },
    })
    const map: Record<string, string> = {}
    rows.forEach((row) => {
      map[row.key] = row.value
    })
    return map
  } catch (error) {
    if (!hasWarnedTranslationDb) {
      console.warn("Traduções dinâmicas desativadas: banco indisponível ou não configurado.")
      if (process.env.NODE_ENV !== "production") {
        console.warn(error instanceof Error ? error.message : error)
      }
      hasWarnedTranslationDb = true
    }
    return {}
  }
}

export async function upsertTranslation(params: { locale: Locale; key: string; value: string }) {
  const { locale, key, value } = params
  return prisma.translation.upsert({
    where: { localeId_key: { localeId: locale, key } },
    update: { value },
    create: { localeId: locale, key, value },
  })
}

export async function deleteTranslation(params: { locale: Locale; key: string }) {
  const { locale, key } = params
  return prisma.translation.delete({
    where: { localeId_key: { localeId: locale, key } },
  })
}
