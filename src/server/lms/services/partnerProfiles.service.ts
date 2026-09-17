import { prisma } from "../../db/prisma"

const defaultProfiles = ["ISV", "VAR", "Referral", "Ambassador", "SI"]

export class PartnerProfilesService {
  private static async ensureDefaults() {
    const existing = await prisma.partnerProfile.findMany({
      where: { name: { in: defaultProfiles } },
      select: { name: true },
    })
    const existingNames = new Set(existing.map((p) => p.name))
    const missing = defaultProfiles.filter((name) => !existingNames.has(name))
    if (missing.length === 0) return
    await prisma.partnerProfile.createMany({
      data: missing.map((name) => ({
        name,
        description: `Perfil ${name} para parceiros Botmaker`,
        active: true,
      })),
      skipDuplicates: true,
    })
  }

  static async list() {
    await PartnerProfilesService.ensureDefaults()
    return prisma.partnerProfile.findMany({ orderBy: { name: "asc" } })
  }

  static async create(data: { name: string; description: string; active?: boolean }) {
    return prisma.partnerProfile.create({
      data: { name: data.name, description: data.description, active: data.active ?? true },
    })
  }

  static async update(id: string, data: Partial<{ name: string; description: string; active: boolean }>) {
    return prisma.partnerProfile.update({
      where: { id },
      data,
    })
  }

  static async remove(id: string) {
    return prisma.partnerProfile.update({ where: { id }, data: { active: false } })
  }
}
