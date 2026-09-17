import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import { env } from "@/server/security/owasp"
import { DashboardLayout } from "@/web/components/layout/DashboardLayout"
import { TrackPlayer } from "@/web/components/tracks/TrackPlayer"

async function getTrack(trackId: string, cookieHeader?: string) {
  const cookieStore = await cookies()
  const resolvedCookieHeader =
    cookieHeader ??
    cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ")
  const headers = resolvedCookieHeader ? { cookie: resolvedCookieHeader } : undefined
  try {
    const res = await fetch(`${env.APP_URL}/api/tracks/${trackId}`, { headers, cache: "no-store" })
    if (res.status === 404 || res.status === 403) return null
    if (!res.ok) return null
    return res.json()
  } catch (err) {
    console.error("Erro ao buscar trilha", err)
    return null
  }
}

export default async function TrackPage({ params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")
  const headers = cookieHeader ? { cookie: cookieHeader } : undefined
  const [data, meRes] = await Promise.all([
    getTrack(trackId, cookieHeader),
    fetch(`${env.APP_URL}/api/auth/me`, { headers, cache: "no-store" }),
  ])
  const user = meRes.ok ? (await meRes.json()).user : null
  if (!data) return notFound()

  return (
    <DashboardLayout
      active="dashboard"
      mainOverflow="visible"
      containerOverflow="visible"
      isAdmin={user?.role === "ADMIN"}
      user={user}
    >
      <TrackPlayer data={data} />
    </DashboardLayout>
  )
}
