import { Role } from "@prisma/client"
import { prisma } from "../../db/prisma"
import { hashPassword } from "../../auth/better-auth"

const userInclude = {
  company: true,
  partnerLinks: { include: { partnerProfile: true } },
}

const formatUser = (u: any) => ({
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  whatsapp: u.whatsapp,
  role: u.role,
  avatarUrl: u.avatarUrl,
  company: u.company,
  partnerProfiles: u.partnerLinks?.map((p: any) => p.partnerProfile),
  createdAt: u.createdAt,
})

export class UsersService {
  static async list() {
    const data = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, include: userInclude })
    return data.map(formatUser)
  }

  static async create(data: {
    firstName: string
    lastName: string
    email: string
    password: string
    whatsapp?: string | null
    companyId?: string | null
    role: Role
    partnerProfileIds?: string[]
  }) {
    const exists = await prisma.user.findUnique({ where: { email: data.email } })
    if (exists) throw new Error("Email já cadastrado")
    const passwordHash = await hashPassword(data.password)
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
        emailVerifiedAt: new Date(),
        whatsapp: data.whatsapp ?? null,
        role: data.role,
        companyId: data.companyId ?? null,
        partnerLinks: data.partnerProfileIds
          ? {
              create: data.partnerProfileIds.map((id) => ({ partnerProfileId: id })),
            }
          : undefined,
      },
      include: userInclude,
    })
    return formatUser(user)
  }

  static async update(id: string, data: Partial<Omit<Parameters<typeof UsersService.create>[0], "email">> & { email?: string }) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new Error("Usuário não encontrado")

    const passwordHash = data.password ? await hashPassword(data.password) : undefined
    const nextRole = (data.role as Role) ?? user.role
    const tokenVersionUpdate = nextRole !== user.role ? { increment: 1 } : undefined
    const updated = await prisma.$transaction(async (tx) => {
      await tx.userPartnerProfile.deleteMany({ where: { userId: id } })
      return tx.user.update({
        where: { id },
        data: {
          firstName: data.firstName ?? user.firstName,
          lastName: data.lastName ?? user.lastName,
          email: data.email ?? user.email,
          passwordHash: passwordHash ?? undefined,
          whatsapp: data.whatsapp ?? user.whatsapp,
          role: nextRole,
          tokenVersion: tokenVersionUpdate,
          companyId: data.companyId ?? user.companyId,
          partnerLinks: data.partnerProfileIds
            ? {
                create: data.partnerProfileIds.map((pid) => ({ partnerProfileId: pid })),
              }
            : undefined,
        },
        include: userInclude,
      })
    })
    return formatUser(updated)
  }

  static async remove(id: string) {
    await this.removeMany([id])
    return true
  }

  static async removeMany(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean)
    if (uniqueIds.length === 0) return 0
    await prisma.$transaction([
      prisma.progress.deleteMany({ where: { userId: { in: uniqueIds } } }),
      prisma.enrollment.deleteMany({ where: { userId: { in: uniqueIds } } }),
      prisma.videoViewEvent.deleteMany({ where: { userId: { in: uniqueIds } } }),
      prisma.videoProgress.deleteMany({ where: { userId: { in: uniqueIds } } }),
      prisma.quizAttempt.deleteMany({ where: { userId: { in: uniqueIds } } }),
      prisma.userPartnerProfile.deleteMany({ where: { userId: { in: uniqueIds } } }),
      prisma.user.deleteMany({ where: { id: { in: uniqueIds } } }),
    ])
    return uniqueIds.length
  }

  static async assignCompanyMany(ids: string[], companyId: string | null) {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean)
    if (uniqueIds.length === 0) return 0
    const result = await prisma.user.updateMany({
      where: { id: { in: uniqueIds } },
      data: { companyId },
    })
    return result.count
  }

  static async addPartnerProfilesMany(ids: string[], partnerProfileIds: string[]) {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean)
    if (uniqueIds.length === 0) return 0
    const uniqueProfiles = Array.from(new Set(partnerProfileIds)).filter(Boolean)
    if (uniqueProfiles.length === 0) return 0
    const data = uniqueIds.flatMap((userId) => uniqueProfiles.map((partnerProfileId) => ({ userId, partnerProfileId })))
    const result = await prisma.userPartnerProfile.createMany({ data, skipDuplicates: true })
    return result.count
  }
}
