"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent } from "@/web/components/ui/card"
import { Button } from "@/web/components/ui/button"
import { Input } from "@/web/components/ui/input"
import { Badge } from "@/web/components/ui/badge"

type Profile = { id: string; name: string; description: string; active: boolean }
const empty = { id: "", name: "", description: "", active: true }

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [form, setForm] = useState(empty)

  const load = async () => {
    const res = await axios.get("/api/lms/partner-profiles")
    setProfiles(res.data)
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    const payload = { name: form.name, description: form.description, active: form.active }
    if (form.id) {
      await axios.put("/api/lms/partner-profiles", { id: form.id, ...payload })
    } else {
      await axios.post("/api/lms/partner-profiles", payload)
    }
    setForm(empty)
    load()
  }

  const remove = async (id: string) => {
    await axios.delete("/api/lms/partner-profiles", { data: { id } })
    load()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Perfis de parceria</h1>
          <p className="text-sm text-muted-foreground">Cadastre e mantenha os perfis ISV/VAR/Referral/Ambassador/SI</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <Card>
            <CardContent className="p-4 space-y-3">
              {profiles.map((p) => (
                <div key={p.id} className="border border-border/50 rounded-lg p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-muted-foreground">{p.description}</div>
                    <Badge variant={p.active ? "default" : "outline"} className="text-[11px] mt-1">
                      {p.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => setForm(p)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="w-full sm:w-auto" onClick={() => remove(p.id)}>
                      Desativar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-lg font-semibold">{form.id ? "Editar perfil" : "Novo perfil"}</h3>
              <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo
              </label>
              <Button onClick={save}>{form.id ? "Atualizar" : "Criar"}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
