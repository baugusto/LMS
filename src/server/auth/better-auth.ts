import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import argon2 from "argon2"
import dns from "dns"
import { env } from "../security/owasp"
import { prisma } from "../db/prisma"
import { Role, User } from "@prisma/client"
import { logError } from "../security/logger"

const SESSION_COOKIE = "ba_session"
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URLS = [
  "https://oauth2.googleapis.com/token",
  "https://www.googleapis.com/oauth2/v4/token",
]
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
const GOOGLE_SCOPES = ["openid", "email", "profile"]

if (process.env.FORCE_IPV4 === "true") {
  dns.setDefaultResultOrder("ipv4first")
}

type GoogleProfile = {
  email: string
  email_verified?: boolean
  given_name?: string
  family_name?: string
  name?: string
  picture?: string
}

type SessionPayload = {
  sub: string
  email: string
  role: Role
  firstName: string
  lastName: string
  preferredLocale?: string
  tokenVersion: number
}

export async function hashPassword(password: string) {
  return argon2.hash(password)
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password)
}

export function signSession(user: SessionPayload) {
  return jwt.sign(user, env.BETTER_AUTH_SECRET, { expiresIn: "7d" })
}

export function verifySession(token?: string): SessionPayload | null {
  if (!token) return null
  try {
    return jwt.verify(token, env.BETTER_AUTH_SECRET) as SessionPayload
  } catch (e) {
    return null
  }
}

export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  return verifySession(token)
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  return verifySession(token)
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

function publicUser(u: User) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    companyId: u.companyId,
    emailVerifiedAt: u.emailVerifiedAt,
    avatarUrl: u.avatarUrl,
  }
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

function createEmailVerificationToken() {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24)
  return { token, tokenHash: hashToken(token), expiresAt }
}

function getGoogleOAuthConfig() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth não configurado")
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: new URL("/api/auth/google/callback", env.APP_URL).toString(),
  }
}

export function getGoogleAuthUrl(state: string) {
  const { clientId, redirectUri } = getGoogleOAuthConfig()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    prompt: "select_account",
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function getGoogleProfileFromCode(code: string): Promise<GoogleProfile> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig()
  let tokenData: { access_token?: string } | null = null
  let lastError: unknown
  for (let index = 0; index < GOOGLE_TOKEN_URLS.length; index += 1) {
    const tokenUrl = GOOGLE_TOKEN_URLS[index]
    try {
      const tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      })
      if (!tokenRes.ok) {
        const shouldFallback = tokenRes.status === 404 || tokenRes.status === 405 || tokenRes.status >= 500
        if (shouldFallback && index < GOOGLE_TOKEN_URLS.length - 1) {
          lastError = new Error(`Token Google indisponível (${tokenRes.status})`)
          continue
        }
        throw new Error("Falha ao obter token do Google")
      }
      tokenData = (await tokenRes.json()) as { access_token?: string }
      break
    } catch (error) {
      lastError = error
      if (index === GOOGLE_TOKEN_URLS.length - 1) {
        break
      }
    }
  }
  if (!tokenData) {
    throw lastError ?? new Error("Falha ao obter token do Google")
  }
  if (!tokenData.access_token) {
    throw new Error("Token de acesso do Google ausente")
  }

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  if (!userRes.ok) {
    throw new Error("Falha ao obter perfil do Google")
  }
  const profile = (await userRes.json()) as GoogleProfile
  if (!profile.email) {
    throw new Error("Email do Google ausente")
  }
  return profile
}

function normalizeGoogleName(profile: GoogleProfile) {
  const givenName = profile.given_name?.trim()
  const familyName = profile.family_name?.trim()
  if (givenName && familyName) {
    return { firstName: givenName, lastName: familyName }
  }
  if (profile.name?.trim()) {
    const parts = profile.name.trim().split(/\s+/)
    const firstName = parts.shift() || "Aluno"
    const lastName = parts.join(" ") || "Google"
    return { firstName, lastName }
  }
  const emailPrefix = profile.email.split("@")[0] || "Aluno"
  return { firstName: givenName || emailPrefix, lastName: familyName || "Google" }
}

export async function upsertGoogleUser(profile: GoogleProfile) {
  if (profile.email_verified === false) {
    throw new Error("Email do Google não verificado")
  }
  const email = profile.email.toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  const verifiedAt = new Date()

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        emailVerifiedAt: existing.emailVerifiedAt ?? verifiedAt,
        avatarUrl: profile.picture?.trim() || existing.avatarUrl,
      },
    })
  }

  const { firstName, lastName } = normalizeGoogleName(profile)
  const passwordHash = await hashPassword(crypto.randomBytes(32).toString("hex"))
  return prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash,
      role: "PARTNER",
      preferredLocale: "pt",
      emailVerifiedAt: verifiedAt,
      avatarUrl: profile.picture?.trim() || null,
    },
  })
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { partnerLinks: { include: { partnerProfile: true } }, company: true },
  })
  if (!user) {
    throw new Error("Credenciais inválidas")
  }
  if (!user.emailVerifiedAt) {
    throw new Error("Email não verificado")
  }

  const match = await verifyPassword(user.passwordHash, password)
  if (!match) {
    throw new Error("Credenciais inválidas")
  }

  const token = signSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    preferredLocale: user.preferredLocale,
    tokenVersion: user.tokenVersion,
  })

  const res = NextResponse.json({ user: { ...publicUser(user), partnerProfiles: user.partnerLinks.map((p) => p.partnerProfile), company: user.company } })
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: env.APP_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}

export async function register(data: { firstName: string; lastName: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    throw new Error("Já existe um usuário com este email")
  }
  const passwordHash = await hashPassword(data.password)
  const verification = createEmailVerificationToken()
  const user = await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash,
      role: "PARTNER",
      preferredLocale: "pt",
      emailVerificationToken: verification.tokenHash,
      emailVerificationTokenExpiresAt: verification.expiresAt,
    },
  })

  const payload: Record<string, unknown> = {
    user: publicUser(user),
    message: "Verifique seu email para ativar a conta.",
  }
  if (env.APP_ENV !== "production") {
    payload.verificationToken = verification.token
  }
  return NextResponse.json(payload, { status: 201 })
}

export async function verifyEmail(token: string) {
  const tokenHash = hashToken(token)
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: tokenHash,
      emailVerificationTokenExpiresAt: { gt: new Date() },
    },
  })
  if (!user) return false
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), emailVerificationToken: null, emailVerificationTokenExpiresAt: null },
  })
  return true
}

export async function logout(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (session) {
    await prisma.user.update({
      where: { id: session.sub },
      data: { tokenVersion: { increment: 1 } },
    })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  })
  return res
}

export async function getSessionUser(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) return null
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { partnerLinks: { include: { partnerProfile: true } }, company: true },
    })
    if (!user || session.tokenVersion !== user.tokenVersion) return null
    return user
  } catch (error) {
    logError("Erro ao carregar sessão", { error })
    return null
  }
}
