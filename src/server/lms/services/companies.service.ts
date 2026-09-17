import { prisma } from "../../db/prisma"

export class CompaniesService {
  static async list() {
    return prisma.company.findMany({
      orderBy: { name: "asc" },
    })
  }

  private static isImageContentType(contentType: string) {
    const normalized = contentType.toLowerCase()
    return normalized.startsWith("image/") || normalized.startsWith("image/x-icon") || normalized.startsWith("image/vnd.microsoft.icon")
  }

  private static async tryFetchImageDataUrl(url: URL) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          accept: "image/*",
          "user-agent": "Mozilla/5.0",
        },
      })
      if (!res.ok) return null
      const contentType = res.headers.get("content-type") || ""
      if (!CompaniesService.isImageContentType(contentType)) return null
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length === 0 || buffer.length > 200_000) return null
      return `data:${contentType};base64,${buffer.toString("base64")}`
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  }

  private static extractIconHrefs(html: string) {
    const hrefs: string[] = []
    const linkTags = html.match(/<link\b[^>]*>/gi) ?? []
    for (const tag of linkTags) {
      const relMatch = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)
      const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)
      if (!relMatch || !hrefMatch) continue
      const rel = relMatch[1].toLowerCase()
      if (!rel.includes("icon")) continue
      hrefs.push(hrefMatch[1])
    }
    return hrefs
  }

  private static async tryFetchIconFromHtml(url: URL) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          accept: "text/html",
          "user-agent": "Mozilla/5.0",
        },
      })
      if (!res.ok) return null
      const contentType = res.headers.get("content-type") || ""
      if (!contentType.toLowerCase().includes("text/html")) return null
      const html = await res.text()
      const hrefs = CompaniesService.extractIconHrefs(html)
      if (hrefs.length === 0) return null
      const base = res.url ? new URL(res.url) : url
      for (const href of hrefs) {
        try {
          const iconUrl = new URL(href, base)
          const dataUrl = await CompaniesService.tryFetchImageDataUrl(iconUrl)
          if (dataUrl) return dataUrl
        } catch {
          continue
        }
      }
      return null
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  }

  private static async fetchGoogleFaviconDataUrl(hostname: string) {
    if (!hostname) return null
    const url = new URL("https://www.google.com/s2/favicons")
    url.searchParams.set("domain", hostname)
    url.searchParams.set("sz", "64")
    return CompaniesService.tryFetchImageDataUrl(url)
  }

  private static async fetchFaviconDataUrl(website?: string | null) {
    if (!website) return null
    let url: URL
    try {
      url = new URL(website)
    } catch {
      return null
    }

    const faviconCandidates = [
      new URL("/favicon.ico", url.origin),
      new URL("/favicon.png", url.origin),
      new URL("/apple-touch-icon.png", url.origin),
      new URL("/apple-touch-icon-precomposed.png", url.origin),
    ]

    for (const candidate of faviconCandidates) {
      const dataUrl = await CompaniesService.tryFetchImageDataUrl(candidate)
      if (dataUrl) return dataUrl
    }

    const htmlIcon = await CompaniesService.tryFetchIconFromHtml(new URL("/", url.origin))
    if (htmlIcon) return htmlIcon
    return CompaniesService.fetchGoogleFaviconDataUrl(url.hostname)
  }

  static async create(data: { name: string; cnpj?: string | null; website?: string | null; logoUrl?: string | null }) {
    const resolvedLogoUrl = data.logoUrl ?? (await CompaniesService.fetchFaviconDataUrl(data.website))
    return prisma.company.create({
      data: {
        name: data.name,
        cnpj: data.cnpj ?? null,
        website: data.website ?? null,
        logoUrl: resolvedLogoUrl ?? null,
      },
    })
  }

  static async update(id: string, data: { name: string; cnpj?: string | null; website?: string | null; logoUrl?: string | null }) {
    const existing = await prisma.company.findUnique({ where: { id } })
    if (!existing) throw new Error("Empresa não encontrada")
    const resolvedLogoUrl = data.logoUrl ?? (await CompaniesService.fetchFaviconDataUrl(data.website))
    return prisma.company.update({
      where: { id },
      data: {
        name: data.name,
        cnpj: data.cnpj ?? null,
        website: data.website ?? null,
        logoUrl: resolvedLogoUrl ?? null,
      },
    })
  }
}
