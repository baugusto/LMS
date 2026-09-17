"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/web/components/ui/badge"
import { Button } from "@/web/components/ui/button"
import { Card, CardContent } from "@/web/components/ui/card"
import { Input } from "@/web/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/web/components/ui/tabs"
import { Locale, localeLabels, locales } from "@/i18n/config"
import { useT } from "@/i18n/useT"
import { Search, Plus, Save, RotateCcw, Globe } from "lucide-react"

type TranslationRow = {
  key: string
  baseValue: string | null
  overrideValue: string | null
}

type Drafts = Record<Locale, Record<string, string>>
type RowsMap = Record<Locale, TranslationRow[]>

const emptyDrafts = locales.reduce((acc, loc) => ({ ...acc, [loc]: {} }), {} as Drafts)
const emptyRows = locales.reduce((acc, loc) => ({ ...acc, [loc]: [] }), {} as RowsMap)

export function TranslationsTabs() {
  const t = useT("translations")
  const [activeLocale, setActiveLocale] = useState<Locale>("pt")
  const [rows, setRows] = useState<RowsMap>(emptyRows)
  const [drafts, setDrafts] = useState<Drafts>(emptyDrafts)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows[activeLocale]
    const term = search.toLowerCase()
    return rows[activeLocale].filter(
      (r) =>
        r.key.toLowerCase().includes(term) ||
        r.baseValue?.toLowerCase().includes(term) ||
        r.overrideValue?.toLowerCase().includes(term),
    )
  }, [rows, activeLocale, search])

  const loadRows = async (locale: Locale, term: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/translations?locale=${locale}&search=${encodeURIComponent(term)}`, {
        cache: "no-store",
        credentials: "include",
      })
      if (!res.ok) {
        const msg = await res.json().catch(() => null)
        throw new Error(msg?.message ?? "Erro ao carregar traduções")
      }
      const data: TranslationRow[] = await res.json()
      setRows((prev) => ({ ...prev, [locale]: data }))
      setDrafts((prev) => ({
        ...prev,
        [locale]: data.reduce((acc, r) => {
          acc[r.key] = r.overrideValue ?? ""
          return acc
        }, {} as Record<string, string>),
      }))
    } catch (error) {
      console.error(error)
      setError("Erro ao carregar traduções.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRows(activeLocale, search)
    }, 250)
    return () => clearTimeout(timer)
  }, [activeLocale, search])

  const handleSave = async (locale: Locale, row: TranslationRow) => {
    const value = drafts[locale][row.key]?.trim() ?? ""
    if (!value) return
    setSavingKey(row.key)
    try {
      const res = await fetch("/api/admin/translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ locale, key: row.key, value }),
      })
      if (!res.ok) throw new Error("Erro ao salvar")
      setRows((prev) => ({
        ...prev,
        [locale]: prev[locale].map((r) => (r.key === row.key ? { ...r, overrideValue: value } : r)),
      }))
    } catch (error) {
      console.error(error)
    } finally {
      setSavingKey(null)
    }
  }

  const handleRevert = async (locale: Locale, row: TranslationRow) => {
    setSavingKey(row.key)
    try {
      const res = await fetch("/api/admin/translations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ locale, key: row.key }),
      })
      if (!res.ok) throw new Error("Erro ao reverter")
      setRows((prev) => ({
        ...prev,
        [locale]: row.baseValue
          ? prev[locale].map((r) => (r.key === row.key ? { ...r, overrideValue: null } : r))
          : prev[locale].filter((r) => r.key !== row.key),
      }))
      setDrafts((prev) => ({
        ...prev,
        [locale]: { ...prev[locale], [row.key]: "" },
      }))
    } catch (error) {
      console.error(error)
    } finally {
      setSavingKey(null)
    }
  }

  const handleCreate = async () => {
    if (!newKey.trim() || !newValue.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/admin/translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ locale: activeLocale, key: newKey.trim(), value: newValue.trim() }),
      })
      if (!res.ok) throw new Error("Erro ao criar")
      setNewKey("")
      setNewValue("")
      await loadRows(activeLocale, search)
    } catch (error) {
      console.error(error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card className="glass-card border-border/50">
      <CardContent className="p-5 space-y-5">
        <Tabs value={activeLocale} onValueChange={(v) => setActiveLocale(v as Locale)}>
          <TabsList className="bg-muted/30 flex flex-wrap gap-2">
            {locales.map((loc) => (
              <TabsTrigger key={loc} value={loc} className="capitalize gap-2">
                <Globe className="w-3.5 h-3.5" />
                {localeLabels[loc]}
                <span className="text-[10px] text-muted-foreground uppercase">({loc})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-5 flex flex-col gap-4">
            {/* Header with search and add */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="uppercase text-xs">
                  {activeLocale}
                </Badge>
                <span className="text-sm text-muted-foreground">{localeLabels[activeLocale]}</span>
                <Badge variant="secondary" className="text-xs">
                  {filteredRows.length} chaves
                </Badge>
              </div>
              
              <div className="flex flex-col gap-2 w-full md:w-auto">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="pl-9 w-full"
                  />
                </div>
                
                {/* Add new key */}
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder={t("newKey")}
                    className="w-full sm:w-40"
                  />
                  <Input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={t("newValue")}
                    className="w-full sm:w-44"
                  />
                  <Button onClick={handleCreate} disabled={creating} className="gap-1.5 w-full sm:w-auto">
                    <Plus className="w-4 h-4" />
                    {t("addKey")}
                  </Button>
                </div>
              </div>
            </div>

            <TabsContent value={activeLocale} className="mt-0">
              <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1.3fr_1.4fr_0.6fr] gap-4 text-xs font-medium text-muted-foreground px-4 py-3 bg-muted/30 rounded-t-xl border border-border/50 border-b-0">
                    <span>{t("key")}</span>
                    <span>{t("value")}</span>
                    <span>{t("actions")}</span>
                  </div>
                  
                  {/* Table Body */}
                  <div className="space-y-0 max-h-[480px] overflow-y-auto border border-border/50 border-t-0 rounded-b-xl">
                    {loading && (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>{t("loading")}</span>
                        </div>
                      </div>
                    )}
                    
                    {error && (
                      <div className="p-4">
                        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                          {error}
                        </div>
                      </div>
                    )}
                    
                    {!loading && filteredRows.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Globe className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t("empty")}</p>
                      </div>
                    )}
                    
                    {filteredRows.map((row, idx) => {
                      const currentValue = drafts[activeLocale][row.key] ?? row.overrideValue ?? ""
                      const isModified = row.overrideValue !== null
                      return (
                        <div
                          key={`${activeLocale}-${row.key}`}
                          className={`grid grid-cols-[1.3fr_1.4fr_0.6fr] gap-4 items-start px-4 py-3 hover:bg-blue-500/5 transition-colors group ${
                            idx !== filteredRows.length - 1 ? 'border-b border-border/30' : ''
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{row.key}</span>
                              {isModified && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                  modificado
                                </Badge>
                              )}
                            </div>
                            {row.baseValue && (
                              <span className="text-xs text-muted-foreground line-clamp-2">
                                Base: {row.baseValue}
                              </span>
                            )}
                          </div>
                          
                          <Input
                            value={currentValue}
                            placeholder={row.baseValue ?? ""}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [activeLocale]: { ...prev[activeLocale], [row.key]: e.target.value },
                              }))
                            }
                            className="h-9"
                          />
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={savingKey === row.key || !currentValue.trim()}
                              onClick={() => handleSave(activeLocale, row)}
                              className="h-8 gap-1"
                            >
                              <Save className="w-3 h-3" />
                              {t("save")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={savingKey === row.key}
                              onClick={() => handleRevert(activeLocale, row)}
                              className="h-8 gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              {t("revert")}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
