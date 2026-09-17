import { NextRequest } from "next/server"
import { env } from "./owasp"

const memoryAttempts = new Map<string, { count: number; first: number }>()

const upstashUrl = env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "")
const upstashToken = env.UPSTASH_REDIS_REST_TOKEN

export function getClientIp(req: NextRequest) {
  const trustProxy = env.APP_ENV === "production" && env.TRUST_PROXY === "true"
  if (trustProxy) {
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    if (forwarded) return forwarded
    const realIp = req.headers.get("x-real-ip")
    if (realIp) return realIp
  }
  const requestIp = (req as NextRequest & { ip?: string }).ip
  return requestIp ?? "unknown"
}

export async function isRateLimited(identifier: string, max = 5, windowMs = 60_000) {
  const key = `ratelimit:auth:${identifier}`
  if (upstashUrl && upstashToken) {
    try {
      const count = await upstashIncrement(key, windowMs, upstashUrl, upstashToken)
      return count > max
    } catch {
      return inMemoryRateLimit(key, max, windowMs)
    }
  }

  return inMemoryRateLimit(key, max, windowMs)
}

async function upstashIncrement(key: string, windowMs: number, url: string, token: string) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
  const incrRes = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers,
    body: JSON.stringify([["INCR", key], ["PTTL", key]]),
  })
  const data = (await incrRes.json()) as Array<{ result: number }>
  const count = data?.[0]?.result ?? 0
  const ttl = data?.[1]?.result ?? -1
  if (ttl < 0) {
    await fetch(`${url}/pipeline`, {
      method: "POST",
      headers,
      body: JSON.stringify([["PEXPIRE", key, windowMs]]),
    })
  }
  return count
}

function inMemoryRateLimit(identifier: string, max: number, windowMs: number) {
  const now = Date.now()
  const record = memoryAttempts.get(identifier)
  if (!record) {
    memoryAttempts.set(identifier, { count: 1, first: now })
    return false
  }
  if (now - record.first > windowMs) {
    memoryAttempts.set(identifier, { count: 1, first: now })
    return false
  }
  record.count += 1
  memoryAttempts.set(identifier, record)
  return record.count > max
}
