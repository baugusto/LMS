import { ResourceType } from "@prisma/client"
import { prisma } from "../../db/prisma"
import { CreateLearningPathSchema, UpdateLearningPathSchema } from "../validation/learningPaths.schema"

const includeFull: any = {
  partnerProfile: true,
  topics: {
    orderBy: { order: "asc" as const },
    include: {
      resources: { orderBy: { title: "asc" as const } },
    },
  },
}

export class LearningPathsService {
  // Admin list
  static async listLearningPathsAdmin() {
    return prisma.learningPath.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: { partnerProfiles: { include: { partnerProfile: true } } } as any,
    })
  }

  static async getLearningPathById(id: string) {
    return prisma.learningPath.findUnique({
      where: { id },
      include: {
        partnerProfiles: { include: { partnerProfile: true } },
        topics: { include: { resources: true }, orderBy: { order: "asc" } },
      } as any,
    })
  }

  static async createLearningPath(data: unknown) {
    const parsed = CreateLearningPathSchema.parse(data)
    const primaryProfile = parsed.partnerProfileIds[0]

    return prisma.learningPath.create(
      {
        data: {
          title: parsed.title,
          description: parsed.description ?? "",
          partnerProfileId: primaryProfile,
          active: parsed.active ?? true,
          order: parsed.order ?? 0,
          partnerProfiles: {
            create: parsed.partnerProfileIds.map((pid) => ({ partnerProfileId: pid })),
          },
          topics: parsed.topics?.length
            ? {
                create: parsed.topics.map((t, idx) => ({
                  ...(t.id ? { id: t.id } : {}),
                  title: t.title,
                  description: t.description ?? "",
                  order: t.order ?? idx,
                  resources: t.resources?.length
                    ? {
                        create: t.resources.map((r) => ({
                          ...(r.id ? { id: r.id } : {}),
                          type: r.type,
                          title: r.title,
                          description: r.description ?? "",
                          url: r.url ?? "",
                          durationMinutes: r.durationMinutes ?? null,
                        })),
                      }
                    : undefined,
                })),
              }
            : undefined,
        } as any,
        include: { partnerProfiles: { include: { partnerProfile: true } } } as any,
      },
    )
  }

  static async updateLearningPath(id: string, data: unknown) {
    const parsed = UpdateLearningPathSchema.parse(data)
    const primaryProfile = parsed.partnerProfileIds ? parsed.partnerProfileIds[0] : undefined

    return prisma.$transaction(async (tx) => {
      if (parsed.partnerProfileIds) {
        await (tx as any).learningPathPartnerProfile.deleteMany({ where: { learningPathId: id } })
      }

      if (parsed.topics) {
        await tx.videoProgress.deleteMany({ where: { resource: { topic: { learningPathId: id } } } })
        await tx.progress.deleteMany({ where: { resource: { topic: { learningPathId: id } } } })
        await tx.resource.deleteMany({ where: { topic: { learningPathId: id } } })
        await tx.topic.deleteMany({ where: { learningPathId: id } })
      }

      const updated = await tx.learningPath.update({
        where: { id },
        data: {
          ...(parsed.title !== undefined ? { title: parsed.title } : {}),
          ...(parsed.description !== undefined ? { description: parsed.description } : {}),
          ...(primaryProfile !== undefined ? { partnerProfileId: primaryProfile } : {}),
          ...(parsed.active !== undefined ? { active: parsed.active } : {}),
          ...(parsed.order !== undefined ? { order: parsed.order } : {}),
          ...(parsed.partnerProfileIds
            ? {
                partnerProfiles: {
                  create: parsed.partnerProfileIds.map((pid) => ({ partnerProfileId: pid })),
                },
              }
            : {}),
          ...(parsed.topics
            ? {
                topics: {
                  create: parsed.topics.map((t, idx) => ({
                    ...(t.id ? { id: t.id } : {}),
                    title: t.title,
                    description: t.description ?? "",
                    order: t.order ?? idx,
                    resources: t.resources?.length
                      ? {
                          create: t.resources.map((r) => ({
                            ...(r.id ? { id: r.id } : {}),
                            type: r.type,
                            title: r.title,
                            description: r.description ?? "",
                            url: r.url ?? "",
                            durationMinutes: r.durationMinutes ?? null,
                          })),
                        }
                      : undefined,
                  })),
                },
              }
            : {}),
        },
        include: { partnerProfiles: { include: { partnerProfile: true } } } as any,
      })
      return updated
    })
  }

  static async deleteLearningPath(id: string) {
    return this.remove(id)
  }

  static async listForUser(userId: string, profileIds: string[], isAdmin: boolean) {
    return prisma.learningPath.findMany({
      where: isAdmin ? undefined : { partnerProfileId: { in: profileIds }, active: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: includeFull,
    })
  }

  static async list(partnerProfileId?: string) {
    return prisma.learningPath.findMany({
      where: partnerProfileId ? { partnerProfileId } : undefined,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: includeFull,
    })
  }

  static async create(data: { title: string; description: string; partnerProfileId: string; active?: boolean; order?: number }) {
    return prisma.learningPath.create({
      data: {
        title: data.title,
        description: data.description,
        partnerProfileId: data.partnerProfileId,
        active: data.active ?? true,
        order: data.order ?? 0,
      },
      include: includeFull,
    })
  }

  static async update(
    id: string,
    data: { title?: string; description?: string; partnerProfileId?: string; active?: boolean; order?: number },
  ) {
    return prisma.learningPath.update({ where: { id }, data, include: includeFull })
  }

  static async remove(id: string) {
    await prisma.$transaction([
      prisma.progress.deleteMany({ where: { resource: { topic: { learningPathId: id } } } }),
      prisma.enrollment.deleteMany({ where: { learningPathId: id } }),
      prisma.learningPathPartnerProfile.deleteMany({ where: { learningPathId: id } }),
      prisma.resource.deleteMany({ where: { topic: { learningPathId: id } } }),
      prisma.topic.deleteMany({ where: { learningPathId: id } }),
      prisma.learningPath.delete({ where: { id } }),
    ])
    return true
  }

  static async createTopic(learningPathId: string, data: { title: string; description: string; order?: number }) {
    return prisma.topic.create({
      data: { learningPathId, title: data.title, description: data.description, order: data.order ?? 0 },
    })
  }

  static async updateTopic(topicId: string, data: { title?: string; description?: string; order?: number }) {
    return prisma.topic.update({ where: { id: topicId }, data })
  }

  static async deleteTopic(topicId: string) {
    await prisma.$transaction([
      prisma.progress.deleteMany({ where: { resource: { topicId } } }),
      prisma.resource.deleteMany({ where: { topicId } }),
      prisma.topic.delete({ where: { id: topicId } }),
    ])
    return true
  }

  static async createResource(
    topicId: string,
    data: { type: ResourceType; title: string; description: string; url: string; durationMinutes?: number | null },
  ) {
    return prisma.resource.create({
      data: { topicId, type: data.type, title: data.title, description: data.description, url: data.url, durationMinutes: data.durationMinutes ?? null },
    })
  }

  static async updateResource(
    resourceId: string,
    data: { type?: ResourceType; title?: string; description?: string; url?: string; durationMinutes?: number | null },
  ) {
    return prisma.resource.update({
      where: { id: resourceId },
      data: { ...data, durationMinutes: data.durationMinutes ?? null },
    })
  }

  static async deleteResource(resourceId: string) {
    await prisma.$transaction([
      prisma.progress.deleteMany({ where: { resourceId } }),
      prisma.resource.delete({ where: { id: resourceId } }),
    ])
    return true
  }
}
