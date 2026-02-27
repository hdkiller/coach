import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = getRouterParam(event, 'id')

  const app = await prisma.oAuthApp.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
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
    }
  })

  if (!app) {
    throw createError({ statusCode: 404, statusMessage: 'OAuth Application not found' })
  }

  // Get users who have authorized this app (Consents)
  const consents = await prisma.oAuthConsent.findMany({
    where: { appId: id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          registrationCountry: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Enhance users with latest token activity if available
  const usersWithActivity = await Promise.all(
    consents.map(async (consent) => {
      const latestToken = await prisma.oAuthToken.findFirst({
        where: { appId: id, userId: consent.userId },
        orderBy: { lastUsedAt: 'desc' },
        select: {
          lastUsedAt: true,
          lastIp: true
        }
      })

      // Get some basic LLM usage stats for this user if they used it via this app?
      // Actually, LlmUsage doesn't have appId yet.
      // But we can show total LLM usage of these users generally or just their app activity.

      return {
        ...consent.user,
        authorizedAt: consent.createdAt,
        lastUsedAt: latestToken?.lastUsedAt,
        lastIp: latestToken?.lastIp
      }
    })
  )

  return {
    app,
    users: usersWithActivity
  }
})
