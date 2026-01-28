import { defineEventHandler, createError, getQuery } from 'h3'
import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  // Strict admin check
  if (!session?.user?.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  const search = (query.q as string) || ''

  const skip = (page - 1) * limit

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } }
        ]
      }
    : {}

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
        createdAt: true,
        integrations: {
          select: {
            provider: true
          }
        },
        _count: {
          select: {
            workouts: true,
            nutrition: true,
            wellness: true,
            chatParticipations: true,
            plannedWorkouts: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  ])

  // Calculate LLM usage stats only for the fetched users
  const userIds = users.map((u) => u.id)
  const llmUsageStats = await prisma.llmUsage.groupBy({
    by: ['userId'],
    _count: {
      _all: true
    },
    _sum: {
      estimatedCost: true
    },
    where: {
      userId: {
        in: userIds
      }
    }
  })

  // Create a map for faster lookup
  const llmStatsMap = new Map(
    llmUsageStats.map((stat) => [
      stat.userId,
      {
        count: stat._count._all,
        cost: stat._sum.estimatedCost || 0
      }
    ])
  )

  // Merge stats into user objects
  const mappedUsers = users.map((user) => ({
    ...user,
    llmUsage: llmStatsMap.get(user.id) || { count: 0, cost: 0 }
  }))

  return {
    users: mappedUsers,
    total
  }
})
