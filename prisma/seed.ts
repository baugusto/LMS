import { PrismaClient, Role, ResourceType, EnrollmentStatus, ProgressStatus } from "@prisma/client"
import argon2 from "argon2"

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await argon2.hash("admin123")
  const partnerPassword = await argon2.hash("partner123")

  const localeList = [
    { id: "pt", label: "Português" },
    { id: "en", label: "English" },
    { id: "es", label: "Español" },
  ]

  for (const locale of localeList) {
    await prisma.locale.upsert({
      where: { id: locale.id },
      update: { label: locale.label, enabled: true },
      create: { id: locale.id, label: locale.label, enabled: true },
    })
  }

  const company = await prisma.company.upsert({
    where: { name: "Botmaker Partner Co." },
    update: {},
    create: {
      name: "Botmaker Partner Co.",
      website: "https://botmaker.com",
    },
  })

  const profiles = ["ISV", "VAR", "Referral", "Ambassador", "SI"]
  const profileMap = new Map<string, string>()
  for (const name of profiles) {
    const p = await prisma.partnerProfile.upsert({
      where: { name },
      update: { active: true },
      create: { name, description: `Perfil ${name} para parceiros Botmaker`, active: true },
    })
    profileMap.set(name, p.id)
  }

  const verifiedAt = new Date()

  await prisma.user.upsert({
    where: { email: "admin@botmaker.academy" },
    update: { emailVerifiedAt: verifiedAt },
    create: {
      firstName: "Admin",
      lastName: "Botmaker",
      email: "admin@botmaker.academy",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      preferredLocale: "pt",
      emailVerifiedAt: verifiedAt,
    },
  })

  const partnerUser = await prisma.user.upsert({
    where: { email: "partner@botmaker.academy" },
    update: { emailVerifiedAt: verifiedAt },
    create: {
      firstName: "Pat",
      lastName: "Ner",
      email: "partner@botmaker.academy",
      passwordHash: partnerPassword,
      role: Role.PARTNER,
      companyId: company.id,
      preferredLocale: "pt",
      emailVerifiedAt: verifiedAt,
      partnerLinks: {
        create: [
          { partnerProfileId: profileMap.get("ISV")! },
          { partnerProfileId: profileMap.get("Referral")! },
        ],
      },
    },
  })

  await prisma.videoViewEvent.deleteMany()
  await prisma.videoProgress.deleteMany()
  await prisma.progress.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.resource.deleteMany()
  await prisma.topic.deleteMany()
  await prisma.learningPathPartnerProfile.deleteMany()
  await prisma.learningPath.deleteMany()

  const learningPathsData = [
    {
      title: "Onboarding ISV",
      description: "Primeiros passos para integradores independentes",
      partnerProfileId: profileMap.get("ISV")!,
      order: 1,
      topics: [
        {
          title: "Introdução",
          description: "Visão geral da plataforma",
          order: 1,
          resources: [
            { type: ResourceType.VIDEO, title: "Bem-vindo", description: "Tour rápido", url: "https://www.youtube.com/watch?v=ysz5S6PUM-U", durationMinutes: 8 },
            { type: ResourceType.PDF, title: "Guia ISV", description: "Documentação inicial", url: "https://drive.google.com/example1" },
          ],
        },
        {
          title: "APIs",
          description: "Integrações e Webhooks",
          order: 2,
          resources: [
            { type: ResourceType.VIDEO, title: "Autenticação", description: "Tokens e callbacks", url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", durationMinutes: 14 },
          ],
        },
      ],
    },
    {
      title: "Playbook VAR",
      description: "Operação técnica e comercial para VAR",
      partnerProfileId: profileMap.get("VAR")!,
      order: 2,
      topics: [
        {
          title: "Discovery",
          description: "Alinhamento inicial",
          order: 1,
          resources: [
            { type: ResourceType.SLIDE, title: "Pitch Deck", description: "Apresentação comercial", url: "https://slides.com/example" },
          ],
        },
        {
          title: "Entrega",
          description: "Blueprint de implementação",
          order: 2,
          resources: [
            { type: ResourceType.VIDEO, title: "Setup", description: "Configuração inicial", url: "https://www.youtube.com/watch?v=oUFJJNQGwhk", durationMinutes: 12 },
          ],
        },
      ],
    },
    {
      title: "Boas Práticas Referral",
      description: "Como indicar oportunidades",
      partnerProfileId: profileMap.get("Referral")!,
      order: 3,
      topics: [
        {
          title: "Prospectar",
          description: "Identificando potenciais clientes",
          order: 1,
          resources: [
            { type: ResourceType.LINK, title: "Checklist", description: "Campos obrigatórios", url: "https://notion.so/example" },
          ],
        },
      ],
    },
  ]

  for (const lp of learningPathsData) {
    await prisma.learningPath.create({
      data: {
        title: lp.title,
        description: lp.description,
        partnerProfileId: lp.partnerProfileId,
        order: lp.order,
        topics: {
          create: lp.topics.map((t) => ({
            title: t.title,
            description: t.description,
            order: t.order,
            resources: {
              create: t.resources.map((r) => ({
                type: r.type,
                title: r.title,
                description: r.description,
                url: r.url,
                durationMinutes: (r as any).durationMinutes ?? null,
              })),
            },
          })),
        },
      },
    })
  }

  const lp = await prisma.learningPath.findFirst({
    where: { partnerProfileId: profileMap.get("ISV")! },
    include: { topics: { include: { resources: true } } },
  })

  if (lp) {
    await prisma.enrollment.create({
      data: {
        userId: partnerUser.id,
        learningPathId: lp.id,
        status: EnrollmentStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    })

    const firstRes = lp.topics.flatMap((t) => t.resources)[0]
    if (firstRes) {
      await prisma.progress.create({
        data: {
          userId: partnerUser.id,
          resourceId: firstRes.id,
          status: ProgressStatus.COMPLETED,
          completedAt: new Date(),
          lastViewedAt: new Date(),
        },
      })
    }
  }

  console.log("Seed concluído. Admin: admin@botmaker.academy / admin123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
