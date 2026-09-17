import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  const sessionCookie = req.cookies.get("ba_session")

  if (!sessionCookie && !pathname.startsWith("/login")) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("redirect", pathname === "/" ? "/dashboard" : pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith("/admin") && sessionCookie?.value) {
    const secret = process.env.BETTER_AUTH_SECRET
    if (secret) {
      try {
        const payload = await verifyJwtPayload(sessionCookie.value, secret)
        if (!payload) {
          throw new Error("Invalid token")
        }
        if (payload.role !== "ADMIN") {
          return NextResponse.redirect(new URL("/dashboard", req.url))
        }
      } catch {
        const loginUrl = new URL("/login", req.url)
        loginUrl.searchParams.set("redirect", pathname)
        return NextResponse.redirect(loginUrl)
      }
    }
  }

  return NextResponse.next()
}

async function verifyJwtPayload(token: string, secret: string) {
  const [header, payload, signature] = token.split(".")
  if (!header || !payload || !signature) return null
  const data = `${header}.${payload}`
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"])
  const valid = await crypto.subtle.verify("HMAC", key, base64UrlToBytes(signature), new TextEncoder().encode(data))
  if (!valid) return null
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)))
  } catch {
    return null
  }
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
}
