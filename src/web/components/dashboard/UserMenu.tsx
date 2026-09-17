"use client"

import { useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/web/components/ui/avatar"
import { cn } from "@/web/lib/utils"
import { LogOut, Sun, Moon, Languages } from "lucide-react"
import { locales, localeLabels, type Locale } from "@/i18n/config"

type Props = {
  initials: string
  onLogoutUrl?: string
  imageUrl?: string
}

const themes = ["light", "dark"] as const
const themeCookieName = "theme"
const localeCookieName = "NEXT_LOCALE"

const readThemeCookie = () => {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${themeCookieName}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

const writeThemeCookie = (next: "light" | "dark") => {
  if (typeof document === "undefined") return
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `${themeCookieName}=${encodeURIComponent(next)}; path=/; max-age=${maxAge}; samesite=lax`
}

const readLocaleCookie = () => {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${localeCookieName}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

const writeLocaleCookie = (next: Locale) => {
  if (typeof document === "undefined") return
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `${localeCookieName}=${encodeURIComponent(next)}; path=/; max-age=${maxAge}; samesite=lax`
}

const localeShort: Record<Locale, string> = {
  pt: "PT",
  en: "EN",
  es: "ES",
}

export function UserMenu({ initials, onLogoutUrl = "/api/auth/logout", imageUrl }: Props) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [locale, setLocale] = useState<Locale>("pt")
  const [imageError, setImageError] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    const stored = readThemeCookie()
    const htmlTheme = typeof document !== "undefined" && document.documentElement.classList.contains("light") ? "light" : "dark"
    const initial = stored === "light" || stored === "dark" ? stored : htmlTheme
    applyTheme(initial)
    setTheme(initial)
  }, [])

  useEffect(() => {
    const stored = readLocaleCookie()
    const htmlLocale = typeof document !== "undefined" ? document.documentElement.lang : null
    const initial =
      stored && locales.includes(stored as Locale)
        ? (stored as Locale)
        : htmlLocale && locales.includes(htmlLocale as Locale)
          ? (htmlLocale as Locale)
          : "pt"
    setLocale(initial)
  }, [])

  useEffect(() => {
    setImageError(false)
  }, [imageUrl])

  const applyTheme = (next: "light" | "dark") => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(next)
    writeThemeCookie(next)
  }

  const toggleTheme = (next: "light" | "dark") => {
    setTheme(next)
    applyTheme(next)
  }

  const toggleLocale = (next: Locale) => {
    setLocale(next)
    writeLocaleCookie(next)
    window.location.reload()
  }

  const handleLogout = async () => {
    try {
      await fetch(onLogoutUrl, { method: "POST", credentials: "include" })
    } catch (err) {
      console.error("Erro ao fazer logout", err)
    } finally {
      window.location.href = "/login"
    }
  }

  return (
    <div className="relative z-30" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-full border border-transparent p-1 hover:border-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all",
        )}
      >
        <Avatar className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 text-blue-400">
          {imageUrl && !imageError && (
            <AvatarImage src={imageUrl} alt="Foto de perfil" onError={() => setImageError(true)} />
          )}
          {(!imageUrl || imageError) && (
            <AvatarFallback className="bg-transparent text-blue-400 font-semibold">{initials}</AvatarFallback>
          )}
        </Avatar>
      </button>
      
      {open && (
        <div className="absolute left-0 bottom-[calc(100%+8px)] w-48 rounded-xl border border-border/50 glass-card shadow-lg z-50 overflow-hidden animate-fade-in">
          {/* Theme Toggle */}
          <div className="px-4 py-3 border-b border-border/50">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
              {theme === "dark" ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
              Tema
            </div>
            <div className="flex gap-2">
              {themes.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={cn(
                    "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all",
                    theme === t 
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-400" 
                      : "border-border/50 text-muted-foreground hover:border-blue-500/30 hover:text-foreground",
                  )}
                  onClick={() => toggleTheme(t)}
                >
                  {t === "light" ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Sun className="w-3 h-3" />
                      Light
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <Moon className="w-3 h-3" />
                      Dark
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Language Toggle */}
          <div className="px-4 py-3 border-b border-border/50">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
              <Languages className="w-3 h-3" />
              Idioma
            </div>
            <div className="flex gap-2">
              {locales.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className={cn(
                    "flex-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium border transition-all flex items-center justify-center",
                    locale === loc
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                      : "border-border/50 text-muted-foreground hover:border-blue-500/30 hover:text-foreground",
                  )}
                  onClick={() => toggleLocale(loc)}
                >
                  {localeShort[loc]}
                </button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <button
            type="button"
            className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/5 flex items-center gap-2 transition-colors border-t border-border/50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
