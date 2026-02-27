import { defineEventHandler, createError } from 'h3'
import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // 1. API Keys Stats
  const totalApiKeys = await prisma.apiKey.count()
  const usersWithKeys = await prisma.apiKey
    .groupBy({
      by: ['userId']
    })
    .then((res) => res.length)

  const activeApiKeys = await prisma.apiKey.count({
    where: {
      lastUsedAt: { gte: thirtyDaysAgo }
    }
  })

  // 2. OAuth Apps Stats
  const totalOAuthApps = await prisma.oAuthApp.count()
  const publicOAuthApps = await prisma.oAuthApp.count({
    where: { isPublic: true }
  })
  const developersCount = await prisma.oAuthApp
    .groupBy({
      by: ['ownerId']
    })
    .then((res) => res.length)

  // 3. OAuth Tokens Stats (Active Sessions)
  const totalOAuthTokens = await prisma.oAuthToken.count()
  const activeOAuthTokens = await prisma.oAuthToken.count({
    where: {
      lastUsedAt: { gte: thirtyDaysAgo }
    }
  })

  // 4. Detailed OAuth Apps List
  const oauthAppsList = await prisma.oAuthApp.findMany({
    include: {
      owner: {
        select: {
          name: true,
          email: true
        }
      },
      _count: {
        select: {
          consents: true,
          tokens: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // 5. Daily Authorizations (Consents) per App
  const dailyAuthorizationsRaw = await prisma.$queryRaw<
    { date: string; appId: string; appName: string; count: bigint }[]
  >`
    SELECT 
      DATE(c."createdAt") as date, 
      c."appId", 
      a."name" as "appName",
      COUNT(*) as count
    FROM "OAuthConsent" c
    JOIN "OAuthApp" a ON c."appId" = a."id"
    WHERE c."createdAt" >= ${thirtyDaysAgo}
    GROUP BY DATE(c."createdAt"), c."appId", a."name"
    ORDER BY date ASC
  `

  const dailyAuthorizations = dailyAuthorizationsRaw.map((row) => ({
    date: new Date(row.date).toISOString().split('T')[0],
    appId: row.appId,
    appName: row.appName,
    count: Number(row.count)
  }))

  return {
    apiKeys: {
      total: totalApiKeys,
      activeLast30Days: activeApiKeys,
      uniqueUsers: usersWithKeys
    },
    oauthApps: {
      total: totalOAuthApps,
      public: publicOAuthApps,
      uniqueDevelopers: developersCount,
      list: oauthAppsList
    },
    oauthTokens: {
      total: totalOAuthTokens,
      activeLast30Days: activeOAuthTokens
    },
    dailyAuthorizations
  }
})
