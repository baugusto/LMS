import { getRequestConfig } from "next-intl/server"
import { defaultLocale, locales } from "./src/i18n/config"
import { getDictionary } from "./src/i18n/getDictionary"
import { applyOverrides } from "./src/i18n/mergeMessages"
import { getLocaleOverrides } from "./src/server/i18n/translation.service"

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locales.includes(locale as any) ? (locale as typeof locales[number]) : defaultLocale
  const base = await getDictionary(resolvedLocale).catch(async () => getDictionary(defaultLocale))
  let overrides: Record<string, string> = {}
  try {
    overrides = await getLocaleOverrides(resolvedLocale)
  } catch (error) {
    console.error("Erro ao carregar overrides de tradução", error)
  }
  const messages = applyOverrides(base, overrides)

  return {
    locale: resolvedLocale,
    messages,
  }
})

export { defaultLocale, locales }
