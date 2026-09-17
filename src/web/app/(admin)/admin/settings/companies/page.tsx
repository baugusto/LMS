import { redirect } from "next/navigation"
import { getSessionFromCookies } from "@/server/auth/better-auth"
import { DashboardLayout } from "@/web/components/layout/DashboardLayout"
import { CompaniesManager } from "@/web/components/settings/CompaniesManager"

export default async function CompaniesPage() {
  const session = await getSessionFromCookies()
  if (!session || session.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout active="companies" isAdmin>
      <CompaniesManager />
    </DashboardLayout>
  )
}
