import type { Metadata } from "next"
import { cookies } from "next/headers"
import { Inter } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { Locale, defaultLocale, locales } from "@/i18n/config"
import { getDictionary } from "@/i18n/getDictionary"
import { applyOverrides } from "@/i18n/mergeMessages"
import { getSessionFromCookies } from "@/server/auth/better-auth"
import { getLocaleOverrides } from "@/server/i18n/translation.service"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Botmaker Academy",
  description: "LMS para parceiros Botmaker",
  icons: {
    icon: "/favicon.svg",
  },
}

function resolveLocale(candidate?: string | null): Locale {
  if (candidate && locales.includes(candidate as Locale)) {
    return candidate as Locale
  }
  return defaultLocale
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const session = await getSessionFromCookies()
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value
  const cookieTheme = cookieStore.get("theme")?.value
  const locale = resolveLocale(cookieLocale ?? session?.preferredLocale)
  const baseMessages = await getDictionary(locale).catch(async () => getDictionary(defaultLocale))
  let overrides: Record<string, string> = {}
  try {
    overrides = await getLocaleOverrides(locale)
  } catch (error) {
    console.error("Erro ao carregar traduções dinâmicas", error)
  }
  const messages = applyOverrides(baseMessages, overrides)
  const theme = cookieTheme === "light" || cookieTheme === "dark" ? cookieTheme : "dark"

  return (
    <html lang={locale} className={theme} suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
