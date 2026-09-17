"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/web/components/ui/button"
import { Input } from "@/web/components/ui/input"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import axios from "axios"

export default function LoginPage() {
  const router = useRouter()
  const search = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const redirect = getSafeRedirect(search.get("redirect"))
  const googleAuthHref = redirect ? `/api/auth/google?redirect=${encodeURIComponent(redirect)}` : "/api/auth/google"
  const externalError = search.get("error")
  const errorMessage = error || (externalError === "google" ? "Não foi possível entrar com o Google." : "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await axios.post(
        "/api/auth/login",
        { email, password },
        {
          withCredentials: true,
        },
      )
      const role = res.data?.user?.role
      const redirect = search.get("redirect")
      const normalizedRedirect = getSafeRedirect(redirect)
      if (normalizedRedirect) {
        router.push(normalizedRedirect)
      } else if (role === "ADMIN") {
        router.push("/admin/users")
      } else {
        router.push("/dashboard")
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Credenciais inválidas")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 relative z-10">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-0 glass-card rounded-3xl overflow-hidden">
        {/* Left Side - Branding */}
        <div className="relative p-10 lg:p-12 flex flex-col justify-between bg-gradient-to-br from-slate-900/50 via-slate-800/30 to-slate-900/50 border-r border-border/50">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 shadow-glow flex items-center justify-center">
              <div className="w-6 h-6 rounded-md bg-muted/20" />
            </div>
            <span className="text-2xl font-semibold text-foreground">Botmaker Academy</span>
          </div>
          
          {/* Welcome Text */}
          <div className="space-y-4 my-auto">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600">
              Bem-vindo ao<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600">
                Botmaker Academy
              </span>
            </h1>
            <p className="text-lg text-white max-w-md">
              Faça login na sua conta para acessar trilhas de aprendizado exclusivas e materiais de parceiros.
            </p>
          </div>

          {/* Decorative Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
            <div className="absolute left-[-20%] bottom-[-20%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute right-[-10%] top-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-3xl" />
            <div className="absolute left-[30%] top-[20%] w-[300px] h-[300px] rounded-full bg-blue-400/5 blur-3xl" />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
            <span>•</span>
            <a href="#" className="hover:text-foreground transition-colors">Termos</a>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex items-center justify-center p-10 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            {/* User Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-lg font-semibold text-blue-400">AB</span>
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">Admin Botmaker</div>
                <div className="text-sm text-muted-foreground">Acesse sua conta</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                    className="h-12 pl-12 rounded-xl bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="h-12 pl-12 pr-12 rounded-xl bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-border bg-input text-blue-500 focus:ring-blue-500/20 focus:ring-offset-0" 
                  />
                  Lembrar-me neste dispositivo
                </label>
                <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Esqueceu sua senha?
                </a>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-button hover:shadow-button-hover transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Entrando...
                  </span>
                ) : "Entrar"}
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm text-muted-foreground">ou continue com</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Google Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl text-base font-medium bg-transparent border-border hover:bg-muted/5 hover:border-blue-500/50 text-foreground transition-all duration-200"
                asChild
              >
                <a href={googleAuthHref} className="flex items-center justify-center gap-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted/30">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path
                        fill="#EA4335"
                        d="M12 10.2v3.9h5.4c-.2 1.4-1.7 4.1-5.4 4.1a6.2 6.2 0 0 1 0-12.4 5.6 5.6 0 0 1 4 1.6l2.7-2.6A9.6 9.6 0 0 0 12 2.4a9.6 9.6 0 1 0 0 19.2c5.5 0 9.1-3.9 9.1-9.4 0-.6-.1-1-.2-1.9H12z"
                      />
                      <path
                        fill="#34A853"
                        d="M3.9 7.4l3.2 2.4a6.2 6.2 0 0 1 8.9-3.2l2.7-2.6A9.6 9.6 0 0 0 3.9 7.4z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M3.9 16.6A9.6 9.6 0 0 0 12 21.6c2.4 0 4.4-.8 5.9-2.2l-2.8-2.3a6.2 6.2 0 0 1-9.2-3.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M21.1 12.2c0-.6-.1-1-.2-1.9H12v3.9h5.4c-.3 1.7-1.9 3.8-5.4 3.8a6.2 6.2 0 0 1-6-4.2l-3.2 2.5A9.6 9.6 0 0 0 12 21.6c5.5 0 9.1-3.9 9.1-9.4z"
                      />
                    </svg>
                  </span>
                  Entrar com Google
                </a>
              </Button>

              {/* Sign Up Link */}
              <p className="text-center text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <a href="#" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Cadastre-se
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function getSafeRedirect(redirect: string | null) {
  if (!redirect) return null
  if (!redirect.startsWith("/")) return null
  if (redirect.startsWith("//")) return null
  if (redirect.includes("://")) return null
  if (redirect === "/" || redirect === "/login") return null
  return redirect
}
