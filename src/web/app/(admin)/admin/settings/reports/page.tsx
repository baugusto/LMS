import { redirect } from "next/navigation"
import { getSessionFromCookies } from "@/server/auth/better-auth"
import { DashboardLayout } from "@/web/components/layout/DashboardLayout"
import { Card, CardContent } from "@/web/components/ui/card"
import { ReportsTabs } from "@/web/components/reports/ReportsTabs"
import { getCompanyProgressReport, getPartnerProfileProgressReport, getUserProgressReport } from "@/server/lms/services/reports.service"
import { prisma } from "@/server/db/prisma"

export default async function ReportsPage() {
  const session = await getSessionFromCookies()
  if (!session || session.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const [companies, profiles, users, companyOptions, partnerProfileOptions, learningPathOptions] = await Promise.all([
    getCompanyProgressReport(),
    getPartnerProfileProgressReport(),
    getUserProgressReport(),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.partnerProfile.findMany({ select: { id: true, name: true, active: true }, orderBy: { name: "asc" } }),
    prisma.learningPath.findMany({
      select: { id: true, title: true, active: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    }),
  ])

  return (
    <DashboardLayout active="reports" isAdmin>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Relatórios de Progresso</h1>
          <p className="text-sm text-muted-foreground">Acompanhe a evolução das trilhas por empresa, perfil de parceiro e usuário.</p>
        </div>

        <Card>
          <CardContent className="p-4">
            <ReportsTabs
              companies={companies}
              profiles={profiles}
              users={users}
              companyOptions={companyOptions}
              partnerProfileOptions={partnerProfileOptions}
              learningPathOptions={learningPathOptions}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
