import { NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import { env } from "../security/owasp"

const SESSION_COOKIE = "ba_session"

export type SessionPayload = {
  sub: string
  email: string
  role: "ADMIN" | "PARTNER"
  firstName: string
  lastName: string
  tokenVersion: number
}

export function verifySession(token?: string): SessionPayload | null {
  if (!token) return null
  try {
    return jwt.verify(token, env.BETTER_AUTH_SECRET) as SessionPayload
  } catch {
    return null
  }
}

export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  return verifySession(token)
}
