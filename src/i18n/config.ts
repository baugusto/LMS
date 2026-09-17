export const locales = ["pt", "en", "es"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "pt"

export const localeLabels: Record<Locale, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
}
