"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent } from "@/web/components/ui/card"
import { Button } from "@/web/components/ui/button"
import { Input } from "@/web/components/ui/input"
import { Badge } from "@/web/components/ui/badge"
import { DashboardLayout } from "@/web/components/layout/DashboardLayout"
import { Users, Plus, Edit2, Building2, Shield, UserCircle, Trash2 } from "lucide-react"

type UserDto = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: "ADMIN" | "PARTNER"
  whatsapp?: string | null
  company?: { id: string; name: string } | null
  partnerProfiles?: { id: string; name: string }[]
}

type ProfileDto = { id: string; name: string }
type CompanyDto = { id: string; name: string }

const empty = {
  id: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  whatsapp: "",
  role: "PARTNER" as "ADMIN" | "PARTNER",
  companyId: "",
  partnerProfileIds: [] as string[],
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserDto[]>([])
  const [profiles, setProfiles] = useState<ProfileDto[]>([])
  const [companies, setCompanies] = useState<CompanyDto[]>([])
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkCompanyId, setBulkCompanyId] = useState("")
  const [bulkProfileIds, setBulkProfileIds] = useState<string[]>([])
  const [bulkSaving, setBulkSaving] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const [u, p, c] = await Promise.all([axios.get("/api/lms/users"), axios.get("/api/lms/partner-profiles"), axios.get("/api/lms/companies")])
      setUsers(u.data)
      setProfiles(p.data)
      setCompanies(c.data)
    } catch (err) {
      console.error(err)
      setError("Erro ao carregar usuários.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => users.some((u) => u.id === id)))
  }, [users])

  const save = async () => {
    try {
      setSaving(true)
      const payload: any = { ...form, partnerProfileIds: form.partnerProfileIds }
      if (!payload.password?.trim()) {
        delete payload.password
      }
      if (form.id) {
        await axios.put(`/api/lms/users/${form.id}`, payload)
      } else {
        await axios.post("/api/lms/users", payload)
      }
      setForm(empty)
      load()
    } catch (err) {
      console.error(err)
      alert("Erro ao salvar usuário.")
    } finally {
      setSaving(false)
    }
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    if (users.length === 0) return
    setSelectedIds((prev) => (prev.length === users.length ? [] : users.map((u) => u.id)))
  }

  const removeUser = async (id: string) => {
    const target = users.find((u) => u.id === id)
    const label = target ? `${target.firstName} ${target.lastName}`.trim() : "usuário"
    if (!confirm(`Excluir ${label}?`)) return
    try {
      await axios.delete(`/api/lms/users/${id}`)
      load()
    } catch (err) {
      console.error(err)
      alert("Erro ao excluir usuário.")
    }
  }

  const removeSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Excluir ${selectedIds.length} usuário(s)?`)) return
    try {
      setBulkSaving(true)
      await axios.delete("/api/lms/users", { data: { ids: selectedIds } })
      setSelectedIds([])
      load()
    } catch (err) {
      console.error(err)
      alert("Erro ao excluir usuários.")
    } finally {
      setBulkSaving(false)
    }
  }

  const applyCompany = async () => {
    if (selectedIds.length === 0 || !bulkCompanyId) return
    try {
      setBulkSaving(true)
      await axios.patch("/api/lms/users", { action: "company", ids: selectedIds, companyId: bulkCompanyId })
      setBulkCompanyId("")
      load()
    } catch (err) {
      console.error(err)
      alert("Erro ao associar empresa.")
    } finally {
      setBulkSaving(false)
    }
  }

  const applyProfiles = async () => {
    if (selectedIds.length === 0 || bulkProfileIds.length === 0) return
    try {
      setBulkSaving(true)
      await axios.patch("/api/lms/users", { action: "partner-profiles", ids: selectedIds, partnerProfileIds: bulkProfileIds })
      setBulkProfileIds([])
      load()
    } catch (err) {
      console.error(err)
      alert("Erro ao associar perfis.")
    } finally {
      setBulkSaving(false)
    }
  }

  const allSelected = users.length > 0 && selectedIds.length === users.length

  return (
    <DashboardLayout active="usuarios" isAdmin>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
            <p className="text-sm text-muted-foreground">Gerencie contas e perfis de parceria</p>
          </div>
        </div>
        <Button 
          onClick={() => setForm(empty)}
          className="gap-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* Users List */}
        <Card className="glass-card border-border/50">
          <CardContent className="p-5 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Usuários Cadastrados</h3>
              <Badge variant="secondary" className="text-xs">
                {users.length} usuários
              </Badge>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-border bg-input text-blue-500 focus:ring-blue-500/20"
                  />
                  Selecionar todos
                </label>
                <span className="text-xs text-muted-foreground">{selectedIds.length} selecionado(s)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    Empresa para selecionados
                  </label>
                  <select
                    value={bulkCompanyId}
                    onChange={(e) => setBulkCompanyId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-border bg-input px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="">Selecionar empresa</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={applyCompany}
                    disabled={bulkSaving || selectedIds.length === 0 || !bulkCompanyId}
                    className="w-full"
                  >
                    Aplicar empresa
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    Perfis para associar
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {profiles.map((p) => {
                      const active = bulkProfileIds.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                            active
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                              : "border-border/50 text-muted-foreground hover:border-blue-500/30 hover:text-foreground"
                          }`}
                          onClick={() =>
                            setBulkProfileIds((prev) =>
                              prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                            )
                          }
                          type="button"
                        >
                          {p.name}
                        </button>
                      )
                    })}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={applyProfiles}
                    disabled={bulkSaving || selectedIds.length === 0 || bulkProfileIds.length === 0}
                    className="w-full"
                  >
                    Associar perfis
                  </Button>
                </div>
              </div>

              <Button
                size="sm"
                variant="destructive"
                onClick={removeSelected}
                disabled={bulkSaving || selectedIds.length === 0}
                className="w-full sm:w-auto"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Excluir selecionados
              </Button>
            </div>
            
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Carregando...</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}
            
            {!loading && users.map((u) => (
              <div 
                key={u.id} 
                className="border border-border/50 rounded-xl p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-muted/30 hover:bg-muted/50 hover:border-blue-500/30 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(u.id)}
                    onChange={() => toggleSelected(u.id)}
                    className="h-4 w-4 rounded border-border bg-input text-blue-500 focus:ring-blue-500/20"
                  />
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground flex items-center gap-2">
                      {u.firstName} {u.lastName}
                      <Badge 
                        variant={u.role === "ADMIN" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {u.role}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{u.email}</div>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {(u.partnerProfiles ?? []).map((p) => (
                        <Badge key={p.id} variant="outline" className="text-[10px]">
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 w-full sm:w-auto"
                    onClick={() =>
                      setForm({
                        ...empty,
                        ...u,
                        firstName: u.firstName ?? "",
                        lastName: u.lastName ?? "",
                        email: u.email ?? "",
                        whatsapp: u.whatsapp ?? "",
                        companyId: u.company?.id ?? "",
                        partnerProfileIds: u.partnerProfiles?.map((p) => p.id) ?? [],
                        password: "",
                      })
                    }
                  >
                    <Edit2 className="w-3 h-3" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5 w-full sm:w-auto"
                    onClick={() => removeUser(u.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
            
            {!loading && users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum usuário cadastrado.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form */}
        <Card className="glass-card border-border/50">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                {form.id ? <Edit2 className="w-4 h-4 text-blue-400" /> : <Plus className="w-4 h-4 text-blue-400" />}
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {form.id ? "Editar usuário" : "Novo usuário"}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input 
                placeholder="Nome" 
                value={form.firstName} 
                onChange={(e) => setForm({ ...form, firstName: e.target.value })} 
              />
              <Input 
                placeholder="Sobrenome" 
                value={form.lastName} 
                onChange={(e) => setForm({ ...form, lastName: e.target.value })} 
              />
            </div>
            
            <Input 
              placeholder="Email" 
              type="email"
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
            />
            
            <Input 
              placeholder="Senha" 
              type="password" 
              value={form.password} 
              onChange={(e) => setForm({ ...form, password: e.target.value })} 
            />
            
            <Input 
              placeholder="Whatsapp" 
              value={form.whatsapp} 
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} 
            />
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Empresa
              </label>
              <select
                value={form.companyId}
                onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                className="w-full h-11 rounded-xl border border-border bg-input px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">Sem empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end">
                <a href="/admin/settings/companies" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Gerenciar empresas →
                </a>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Função
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="role" 
                    value="ADMIN" 
                    checked={form.role === "ADMIN"} 
                    onChange={() => setForm({ ...form, role: "ADMIN" })}
                    className="w-4 h-4 text-blue-500 border-border bg-input focus:ring-blue-500/20"
                  />
                  <span className="text-sm text-foreground">ADMIN</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="role" 
                    value="PARTNER" 
                    checked={form.role === "PARTNER"} 
                    onChange={() => setForm({ ...form, role: "PARTNER" })}
                    className="w-4 h-4 text-blue-500 border-border bg-input focus:ring-blue-500/20"
                  />
                  <span className="text-sm text-foreground">PARTNER</span>
                </label>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Perfis de parceria</label>
              <div className="flex flex-wrap gap-2">
                {profiles.map((p) => {
                  const active = form.partnerProfileIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        active 
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/40" 
                          : "border-border/50 text-muted-foreground hover:border-blue-500/30 hover:text-foreground"
                      }`}
                      onClick={() =>
                        setForm({
                          ...form,
                          partnerProfileIds: active
                            ? form.partnerProfileIds.filter((id) => id !== p.id)
                            : [...form.partnerProfileIds, p.id],
                        })
                      }
                      type="button"
                    >
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              {form.id && (
                <Button 
                  variant="outline" 
                  onClick={() => setForm(empty)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              )}
              <Button 
                onClick={save} 
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Salvando...
                  </span>
                ) : form.id ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
