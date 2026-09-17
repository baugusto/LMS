import { prisma } from "@/server/db/prisma"
import { ProgressStatus, ResourceType } from "@prisma/client"

export type TrackProgressInfo = {
  learningPathId: string
  learningPathTitle: string
  avgPercent: number
  usersCompleted: number
  totalUsers: number
}

export type CompanyProgressRow = {
  companyId: string
  companyName: string
  partnerProfileNames: string[]
  totalUsers: number
  avgPercent: number
  completedUsers: number
  tracks: TrackProgressInfo[]
}

export type PartnerProfileProgressRow = {
  partnerProfileId: string
  partnerProfileName: string
  companiesCount: number
  totalUsers: number
  avgPercent: number
  tracks: TrackProgressInfo[]
}

export type UserProgressRow = {
  userId: string
  userName: string
  email: string
  companyName?: string
  partnerProfileNames: string[]
  avgPercent: number
  tracks: TrackProgressInfo[]
}

type UserSummary = {
  userId: string
  userName: string
  email: string
  companyId?: string | null
  companyName?: string | null
  partnerProfileIds: string[]
  partnerProfileNames: string[]
}

type UserTrackAverage = {
  avgPercent: number
}

type ReportData = {
  users: UserSummary[]
  companies: { id: string; name: string }[]
  partnerProfiles: { id: string; name: string }[]
  resources: { id: string; learningPathId: string; type: ResourceType }[]
  progress: { userId: string; resourceId: string; status: ProgressStatus }[]
  videoProgress: { userId: string; resourceId: string; maxPercentViewed: number }[]
  learningPathTitleById: Map<string, string>
}

async function fetchReportData(): Promise<ReportData> {
  const [users, companies, partnerProfiles, learningPaths, resources, progress, videoProgress] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: { select: { id: true, name: true } },
        partnerLinks: { select: { partnerProfile: { select: { id: true, name: true } } } },
      },
    }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.partnerProfile.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.learningPath.findMany({ select: { id: true, title: true } }),
    prisma.resource.findMany({
      select: {
        id: true,
        type: true,
        topic: { select: { learningPathId: true } },
      },
    }),
    prisma.progress.findMany({
      select: {
        userId: true,
        resourceId: true,
        status: true,
      },
    }),
    prisma.videoProgress.findMany({
      select: {
        userId: true,
        resourceId: true,
        maxPercentViewed: true,
      },
    }),
  ])

  const summaries: UserSummary[] = users.map((user) => {
    const profileMap = new Map(user.partnerLinks.map((link) => [link.partnerProfile.id, link.partnerProfile.name]))
    const partnerProfileIds = Array.from(profileMap.keys())
    return {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      companyId: user.company?.id,
      companyName: user.company?.name,
      partnerProfileIds,
      partnerProfileNames: partnerProfileIds.map((id) => profileMap.get(id) ?? ""),
    }
  })

  const learningPathTitleById = new Map(learningPaths.map((lp) => [lp.id, lp.title]))
  const mappedResources = resources.map((resource) => ({
    id: resource.id,
    type: resource.type,
    learningPathId: resource.topic.learningPathId,
  }))

  return {
    users: summaries,
    companies,
    partnerProfiles,
    resources: mappedResources,
    progress,
    videoProgress,
    learningPathTitleById,
  }
}

function buildUserTrackAverages(params: {
  resources: { id: string; learningPathId: string; type: ResourceType }[]
  progress: { userId: string; resourceId: string; status: ProgressStatus }[]
  videoProgress: { userId: string; resourceId: string; maxPercentViewed: number }[]
}) {
  const resourcesByPath = new Map<string, { id: string; type: ResourceType }[]>()
  const resourcePathById = new Map<string, string>()
  params.resources.forEach((resource) => {
    const list = resourcesByPath.get(resource.learningPathId) ?? []
    list.push({ id: resource.id, type: resource.type })
    resourcesByPath.set(resource.learningPathId, list)
    resourcePathById.set(resource.id, resource.learningPathId)
  })

  const progressByUser = new Map<string, Map<string, ProgressStatus>>()
  params.progress.forEach((entry) => {
    const map = progressByUser.get(entry.userId) ?? new Map()
    map.set(entry.resourceId, entry.status)
    progressByUser.set(entry.userId, map)
  })

  const videoByUser = new Map<string, Map<string, number>>()
  params.videoProgress.forEach((entry) => {
    const map = videoByUser.get(entry.userId) ?? new Map()
    map.set(entry.resourceId, entry.maxPercentViewed ?? 0)
    videoByUser.set(entry.userId, map)
  })

  const activityByUserPath = new Map<string, Set<string>>()
  params.progress.forEach((entry) => {
    const pathId = resourcePathById.get(entry.resourceId)
    if (!pathId) return
    const set = activityByUserPath.get(entry.userId) ?? new Set<string>()
    set.add(pathId)
    activityByUserPath.set(entry.userId, set)
  })
  params.videoProgress.forEach((entry) => {
    const pathId = resourcePathById.get(entry.resourceId)
    if (!pathId) return
    const set = activityByUserPath.get(entry.userId) ?? new Set<string>()
    set.add(pathId)
    activityByUserPath.set(entry.userId, set)
  })

  const averages = new Map<string, Map<string, UserTrackAverage>>()
  activityByUserPath.forEach((paths, userId) => {
    const avgMap = new Map<string, UserTrackAverage>()
    const userProgress = progressByUser.get(userId) ?? new Map()
    const userVideo = videoByUser.get(userId) ?? new Map()

    paths.forEach((learningPathId) => {
      const resources = resourcesByPath.get(learningPathId) ?? []
      if (resources.length === 0) return
      let sum = 0
      resources.forEach((resource) => {
        if (resource.type === ResourceType.VIDEO) {
          const videoPercent = userVideo.get(resource.id)
          if (videoPercent !== undefined) {
            sum += videoPercent
            return
          }
          const status = userProgress.get(resource.id)
          sum += status === ProgressStatus.COMPLETED ? 100 : 0
          return
        }
        const status = userProgress.get(resource.id)
        sum += status === ProgressStatus.COMPLETED ? 100 : 0
      })
      const avg = Math.round(sum / resources.length)
      avgMap.set(learningPathId, { avgPercent: avg })
    })

    averages.set(userId, avgMap)
  })

  return averages
}

function buildUserAvgPercent(userTrackAverages: Map<string, Map<string, UserTrackAverage>>) {
  const avgMap = new Map<string, number>()
  userTrackAverages.forEach((trackMap, userId) => {
    const values = Array.from(trackMap.values())
    const avg = values.length ? Math.round(values.reduce((sum, item) => sum + item.avgPercent, 0) / values.length) : 0
    avgMap.set(userId, avg)
  })
  return avgMap
}

function buildTrackStatsForUsers(params: {
  userIds: string[]
  userTrackAverages: Map<string, Map<string, UserTrackAverage>>
  learningPathTitleById: Map<string, string>
}): TrackProgressInfo[] {
  const trackMap: Record<
    string,
    { sum: number; users: number; completed: number; title: string }
  > = {}

  params.userIds.forEach((userId) => {
    const userTracks = params.userTrackAverages.get(userId)
    if (!userTracks) return
    userTracks.forEach((track, learningPathId) => {
      const existing =
        trackMap[learningPathId] ??
        ({
          sum: 0,
          users: 0,
          completed: 0,
          title: params.learningPathTitleById.get(learningPathId) ?? "Trilha",
        } as { sum: number; users: number; completed: number; title: string })

      existing.sum += track.avgPercent
      existing.users += 1
      if (track.avgPercent >= 90) existing.completed += 1
      trackMap[learningPathId] = existing
    })
  })

  return Object.entries(trackMap).map(([learningPathId, value]) => ({
    learningPathId,
    learningPathTitle: value.title,
    avgPercent: value.users > 0 ? Math.round(value.sum / value.users) : 0,
    usersCompleted: value.completed,
    totalUsers: value.users,
  }))
}

function buildUserRows(params: {
  users: UserSummary[]
  userTrackAverages: Map<string, Map<string, UserTrackAverage>>
  learningPathTitleById: Map<string, string>
  userAvgPercent: Map<string, number>
}): UserProgressRow[] {
  return params.users.map((user) => {
    const trackMap = params.userTrackAverages.get(user.userId) ?? new Map()
    const tracks = Array.from(trackMap.entries()).map(([learningPathId, track]) => ({
      learningPathId,
      learningPathTitle: params.learningPathTitleById.get(learningPathId) ?? "Trilha",
      avgPercent: track.avgPercent,
      usersCompleted: track.avgPercent >= 90 ? 1 : 0,
      totalUsers: 1,
    }))

    return {
      userId: user.userId,
      userName: user.userName,
      email: user.email,
      companyName: user.companyName ?? undefined,
      partnerProfileNames: user.partnerProfileNames,
      avgPercent: params.userAvgPercent.get(user.userId) ?? 0,
      tracks,
    }
  })
}

function buildCompanyRows(params: {
  users: UserSummary[]
  companies: { id: string; name: string }[]
  userTrackAverages: Map<string, Map<string, UserTrackAverage>>
  learningPathTitleById: Map<string, string>
  userAvgPercent: Map<string, number>
}): CompanyProgressRow[] {
  const byCompany = new Map<string, UserSummary[]>()
  params.users.forEach((user) => {
    const key = user.companyId ?? "sem-empresa"
    const list = byCompany.get(key) ?? []
    list.push(user)
    byCompany.set(key, list)
  })

  const rows: CompanyProgressRow[] = params.companies.map((company) => {
    const users = byCompany.get(company.id) ?? []
    const totalUsers = users.length
    const avgPercent =
      totalUsers > 0
        ? Math.round(users.reduce((sum, u) => sum + (params.userAvgPercent.get(u.userId) ?? 0), 0) / totalUsers)
        : 0
    const completedUsers = users.filter((u) => (params.userAvgPercent.get(u.userId) ?? 0) >= 90).length
    const partnerProfileNames = Array.from(
      new Set(users.flatMap((u) => u.partnerProfileNames.filter((name) => name.trim()))),
    )
    const tracks = buildTrackStatsForUsers({
      userIds: users.map((u) => u.userId),
      userTrackAverages: params.userTrackAverages,
      learningPathTitleById: params.learningPathTitleById,
    })

    return {
      companyId: company.id,
      companyName: company.name,
      partnerProfileNames,
      totalUsers,
      avgPercent,
      completedUsers,
      tracks,
    }
  })

  const noCompanyUsers = byCompany.get("sem-empresa") ?? []
  if (noCompanyUsers.length > 0) {
    const totalUsers = noCompanyUsers.length
    const avgPercent =
      totalUsers > 0
        ? Math.round(
            noCompanyUsers.reduce((sum, u) => sum + (params.userAvgPercent.get(u.userId) ?? 0), 0) / totalUsers,
          )
        : 0
    const completedUsers = noCompanyUsers.filter((u) => (params.userAvgPercent.get(u.userId) ?? 0) >= 90).length
    const partnerProfileNames = Array.from(
      new Set(noCompanyUsers.flatMap((u) => u.partnerProfileNames.filter((name) => name.trim()))),
    )
    const tracks = buildTrackStatsForUsers({
      userIds: noCompanyUsers.map((u) => u.userId),
      userTrackAverages: params.userTrackAverages,
      learningPathTitleById: params.learningPathTitleById,
    })

    rows.push({
      companyId: "sem-empresa",
      companyName: "Sem empresa",
      partnerProfileNames,
      totalUsers,
      avgPercent,
      completedUsers,
      tracks,
    })
  }

  return rows
}

function buildPartnerProfileRows(params: {
  users: UserSummary[]
  partnerProfiles: { id: string; name: string }[]
  userTrackAverages: Map<string, Map<string, UserTrackAverage>>
  learningPathTitleById: Map<string, string>
  userAvgPercent: Map<string, number>
}): PartnerProfileProgressRow[] {
  const profileBuckets = new Map<string, { name: string; users: UserSummary[] }>()
  params.partnerProfiles.forEach((profile) => {
    profileBuckets.set(profile.id, { name: profile.name, users: [] })
  })

  params.users.forEach((user) => {
    user.partnerProfileIds.forEach((profileId, idx) => {
      const name = user.partnerProfileNames[idx] ?? "Perfil"
      const bucket = profileBuckets.get(profileId) ?? { name, users: [] }
      bucket.users.push(user)
      profileBuckets.set(profileId, bucket)
    })
  })

  return params.partnerProfiles.map((profile) => {
    const bucket = profileBuckets.get(profile.id) ?? { name: profile.name, users: [] }
    const users = bucket.users
    const totalUsers = users.length
    const avgPercent =
      totalUsers > 0
        ? Math.round(users.reduce((sum, u) => sum + (params.userAvgPercent.get(u.userId) ?? 0), 0) / totalUsers)
        : 0
    const companies = new Set(users.map((u) => u.companyId ?? "sem-empresa"))
    const tracks = buildTrackStatsForUsers({
      userIds: users.map((u) => u.userId),
      userTrackAverages: params.userTrackAverages,
      learningPathTitleById: params.learningPathTitleById,
    })

    return {
      partnerProfileId: profile.id,
      partnerProfileName: profile.name,
      companiesCount: totalUsers > 0 ? companies.size : 0,
      totalUsers,
      avgPercent,
      tracks,
    }
  })
}

export async function getCompanyProgressReport(): Promise<CompanyProgressRow[]> {
  const data = await fetchReportData()
  const userTrackAverages = buildUserTrackAverages({
    resources: data.resources,
    progress: data.progress,
    videoProgress: data.videoProgress,
  })
  const userAvgPercent = buildUserAvgPercent(userTrackAverages)
  return buildCompanyRows({
    users: data.users,
    companies: data.companies,
    userTrackAverages,
    learningPathTitleById: data.learningPathTitleById,
    userAvgPercent,
  })
}

export async function getPartnerProfileProgressReport(): Promise<PartnerProfileProgressRow[]> {
  const data = await fetchReportData()
  const userTrackAverages = buildUserTrackAverages({
    resources: data.resources,
    progress: data.progress,
    videoProgress: data.videoProgress,
  })
  const userAvgPercent = buildUserAvgPercent(userTrackAverages)
  return buildPartnerProfileRows({
    users: data.users,
    partnerProfiles: data.partnerProfiles,
    userTrackAverages,
    learningPathTitleById: data.learningPathTitleById,
    userAvgPercent,
  })
}

export async function getUserProgressReport(): Promise<UserProgressRow[]> {
  const data = await fetchReportData()
  const userTrackAverages = buildUserTrackAverages({
    resources: data.resources,
    progress: data.progress,
    videoProgress: data.videoProgress,
  })
  const userAvgPercent = buildUserAvgPercent(userTrackAverages)
  return buildUserRows({
    users: data.users,
    userTrackAverages,
    learningPathTitleById: data.learningPathTitleById,
    userAvgPercent,
  })
}
