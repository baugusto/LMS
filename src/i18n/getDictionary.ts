import type { Locale } from "./config"

export async function getDictionary(locale: Locale) {
  const dict = await import(`./locales/${locale}.json`).then((m) => m.default)
  return dict as Record<string, any>
}
