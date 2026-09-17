import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createTranslator } from "use-intl/core"
import { Locale, defaultLocale, locales } from "@/i18n/config"
import { getDictionary } from "@/i18n/getDictionary"
import { applyOverrides } from "@/i18n/mergeMessages"
import { getSessionFromCookies } from "@/server/auth/better-auth"
import { getLocaleOverrides } from "@/server/i18n/translation.service"
import { DashboardLayout } from "@/web/components/layout/DashboardLayout"
import { TranslationsTabs } from "@/web/components/translations/TranslationsTabs"
import { Languages } from "lucide-react"

function resolveLocale(candidate?: string | null): Locale {
  if (candidate && locales.includes(candidate as Locale)) {
    return candidate as Locale
  }
  return defaultLocale
}

export default async function TranslationsPage() {
  const session = await getSessionFromCookies()
  if (!session || session.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value
  const locale = resolveLocale(cookieLocale ?? session?.preferredLocale)
  const baseMessages = await getDictionary(locale).catch(async () => getDictionary(defaultLocale))
  let overrides: Record<string, string> = {}
  try {
    overrides = await getLocaleOverrides(locale)
  } catch (error) {
    console.error("Erro ao carregar traduções dinâmicas", error)
  }
  const messages = applyOverrides(baseMessages, overrides)
  const t = createTranslator({ locale, messages, namespace: "translations" })

  return (
    <DashboardLayout active="translations" isAdmin>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Languages className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        <TranslationsTabs />
      </div>
    </DashboardLayout>
  )
}
