import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { loginSchema, registerSchema } from "@/server/lms/validation/auth.schema"
import { getGoogleAuthUrl, getGoogleProfileFromCode, login, logout, register, signSession, upsertGoogleUser, getSessionUser, verifyEmail } from "@/server/auth/better-auth"
import { env, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "@/server/security/owasp"
import { getClientIp, isRateLimited } from "@/server/security/rateLimit"

const SESSION_COOKIE = "ba_session"
const GOOGLE_STATE_COOKIE = "ba_google_state"
const GOOGLE_REDIRECT_COOKIE = "ba_google_redirect"

async function getAction(paramsPromise: Promise<{ "better-auth"?: string[] }>) {
  const params = await paramsPromise
  return params["better-auth"] ?? []
}

function getSafeRedirect(redirect?: string | null) {
  if (!redirect) return null
  if (!redirect.startsWith("/")) return null
  if (redirect.startsWith("//")) return null
  if (redirect.includes("://")) return null
  if (redirect === "/" || redirect === "/login") return null
  return redirect
}

function redirectToLogin(message?: string) {
  const url = new URL("/login", env.APP_URL)
  if (message) {
    url.searchParams.set("error", message)
  }
  return NextResponse.redirect(url)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ "better-auth"?: string[] }> }) {
  const [action] = await getAction(params)
  const ip = getClientIp(req)

  if (action === "login") {
    console.log("POST /api/auth/login")
    if (await isRateLimited(ip, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({ message: "Muitas tentativas. Tente novamente em instantes." }, { status: 429 })
    }
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ message: "Credenciais inválidas" }, { status: 400 })
    try {
      const res = await login(parsed.data.email, parsed.data.password)
      return res
    } catch (error: any) {
      const prismaUnavailable =
        error?.code === "P1001" ||
        error?.code === "P1000" ||
        error?.name === "PrismaClientInitializationError" ||
        error?.message?.includes?.("Can't reach database")

      if (prismaUnavailable) {
        console.error("Banco de dados indisponível no login", error)
        return NextResponse.json(
          { message: "Serviço indisponível." },
          { status: 503 },
        )
      }

      console.error("Erro login", error)
      if (error?.message === "Email não verificado") {
        return NextResponse.json({ message: "Email não verificado" }, { status: 403 })
      }
      return NextResponse.json({ message: "Credenciais inválidas" }, { status: 400 })
    }
  }

  if (action === "register") {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
    try {
      return await register(parsed.data)
    } catch (e: any) {
      return NextResponse.json({ message: "Erro ao registrar" }, { status: 400 })
    }
  }

  if (action === "verify-email") {
    const body = await req.json()
    const token = body?.token
    if (!token || typeof token !== "string") return NextResponse.json({ message: "Token inválido" }, { status: 400 })
    const ok = await verifyEmail(token)
    if (!ok) return NextResponse.json({ message: "Token inválido ou expirado" }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action === "logout") {
    return logout(req)
  }

  return NextResponse.json({ message: "Ação não suportada" }, { status: 404 })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ "better-auth"?: string[] }> }) {
  const [action, subAction] = await getAction(params)
  if (action === "google" && subAction === "callback") {
    const state = req.nextUrl.searchParams.get("state")
    const code = req.nextUrl.searchParams.get("code")
    const error = req.nextUrl.searchParams.get("error")
    const cookieState = req.cookies.get(GOOGLE_STATE_COOKIE)?.value
    if (error || !state || !code || !cookieState || state !== cookieState) {
      return redirectToLogin("google")
    }

    try {
      const profile = await getGoogleProfileFromCode(code)
      const user = await upsertGoogleUser(profile)
      const token = signSession({
        sub: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        preferredLocale: user.preferredLocale,
        tokenVersion: user.tokenVersion,
      })
      const redirectCookie = req.cookies.get(GOOGLE_REDIRECT_COOKIE)?.value
      const redirectTo = getSafeRedirect(redirectCookie) ?? "/dashboard"
      const res = NextResponse.redirect(new URL(redirectTo, env.APP_URL))
      res.cookies.set({
        name: SESSION_COOKIE,
        value: token,
        httpOnly: true,
        secure: env.APP_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      })
      res.cookies.set({ name: GOOGLE_STATE_COOKIE, value: "", path: "/api/auth", maxAge: 0 })
      res.cookies.set({ name: GOOGLE_REDIRECT_COOKIE, value: "", path: "/api/auth", maxAge: 0 })
      return res
    } catch (error) {
      console.error("Erro no login com Google", error)
      return redirectToLogin("google")
    }
  }

  if (action === "google") {
    try {
      const state = crypto.randomBytes(16).toString("hex")
      const redirect = getSafeRedirect(req.nextUrl.searchParams.get("redirect"))
      const res = NextResponse.redirect(getGoogleAuthUrl(state))
      res.cookies.set({
        name: GOOGLE_STATE_COOKIE,
        value: state,
        httpOnly: true,
        secure: env.APP_ENV === "production",
        sameSite: "lax",
        path: "/api/auth",
        maxAge: 60 * 10,
      })
      if (redirect) {
        res.cookies.set({
          name: GOOGLE_REDIRECT_COOKIE,
          value: redirect,
          httpOnly: true,
          secure: env.APP_ENV === "production",
          sameSite: "lax",
          path: "/api/auth",
          maxAge: 60 * 10,
        })
      }
      return res
    } catch (error) {
      console.error("Erro ao iniciar login com Google", error)
      return redirectToLogin("google")
    }
  }

  if (action === "me") {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
    return NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        company: user.company,
        partnerProfiles: user.partnerLinks.map((p) => p.partnerProfile),
      },
    })
  }
  return NextResponse.json({ message: "Ação não suportada" }, { status: 404 })
}
