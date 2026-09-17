"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/web/components/ui/card"
import { Button } from "@/web/components/ui/button"
import { Input } from "@/web/components/ui/input"
import { Building2, Plus, Globe, FileText } from "lucide-react"

type Company = {
  id: string
  name: string
  cnpj?: string | null
  website?: string | null
  logoUrl?: string | null
}

const empty = { id: "", name: "", cnpj: "", website: "", logoUrl: "" }
const isValidLogoUrl = (value?: string | null) => {
  if (!value) return false
  if (value.startsWith("data:image/")) {
    const commaIndex = value.indexOf(",")
    return commaIndex > -1 && value.length > commaIndex + 1
  }
  return value.startsWith("http")
}

export function CompaniesManager() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const load = async () => {
    setError("")
    try {
      setLoading(true)
      const res = await axios.get("/api/lms/companies")
      setCompanies(res.data)
    } catch (err) {
      console.error(err)
      setError("Não foi possível carregar as empresas.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    try {
      setSaving(true)
      if (form.id) {
        await axios.put("/api/lms/companies", {
          id: form.id,
          name: form.name,
          cnpj: form.cnpj,
          website: form.website,
          logoUrl: form.logoUrl,
        })
        setSuccess("Empresa atualizada com sucesso.")
      } else {
        await axios.post("/api/lms/companies", {
          name: form.name,
          cnpj: form.cnpj,
          website: form.website,
          logoUrl: form.logoUrl,
        })
        setSuccess("Empresa criada com sucesso.")
      }
      setForm(empty)
      load()
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.message ?? (form.id ? "Erro ao atualizar empresa." : "Erro ao criar empresa."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground">Cadastre empresas e vincule usuários a elas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* New Company Form */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              {form.id ? "Editar empresa" : "Nova empresa"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={save} className="space-y-4">
              <Input 
                placeholder="Nome da empresa" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                required 
              />
              <Input 
                placeholder="CNPJ (opcional)" 
                value={form.cnpj} 
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })} 
              />
              <Input 
                placeholder="Website (opcional)" 
                value={form.website} 
                onChange={(e) => setForm({ ...form, website: e.target.value })} 
              />
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-xl border border-border/50 bg-muted/50 flex items-center justify-center overflow-hidden">
                  {isValidLogoUrl(form.logoUrl) ? (
                    <img src={form.logoUrl || ""} alt="Logo da empresa" className="h-full w-full object-contain" />
                  ) : (
                    <Building2 className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) {
                        setForm({ ...form, logoUrl: "" })
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = () => setForm({ ...form, logoUrl: String(reader.result || "") })
                      reader.readAsDataURL(file)
                    }}
                  />
                  <p className="text-xs text-muted-foreground">PNG ou JPG, fundo transparente recomendado.</p>
                </div>
              </div>
              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                  {success}
                </div>
              )}
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Salvando..." : form.id ? "Atualizar empresa" : "Criar empresa"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Companies List */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              Empresas cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Carregando empresas...</span>
                </div>
              </div>
            )}
            {!loading && companies.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma empresa cadastrada.</p>
              </div>
            )}
            {!loading &&
              companies.map((c) => (
                <div 
                  key={c.id} 
                  className={`rounded-xl border bg-muted/30 px-4 py-4 transition-all group cursor-pointer ${
                    form.id === c.id
                      ? "border-blue-500/60 bg-blue-500/10"
                      : "border-border/50 hover:bg-muted/50 hover:border-blue-500/30"
                  }`}
                  onClick={() =>
                    setForm({
                      id: c.id,
                      name: c.name,
                      cnpj: c.cnpj ?? "",
                      website: c.website ?? "",
                      logoUrl: isValidLogoUrl(c.logoUrl) ? c.logoUrl ?? "" : "",
                    })
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl border border-border/50 bg-muted/50 flex items-center justify-center overflow-hidden">
                      {isValidLogoUrl(c.logoUrl) ? (
                        <img src={c.logoUrl || ""} alt={c.name} className="h-full w-full object-contain" />
                      ) : (
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-semibold text-foreground group-hover:text-blue-400 transition-colors truncate">{c.name}</div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-3 space-y-1.5">
                    {c.cnpj && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        <span>CNPJ: {c.cnpj}</span>
                      </div>
                    )}
                    {c.website && (
                      <div className="flex items-center gap-2 truncate">
                        <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
