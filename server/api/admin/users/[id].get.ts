import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  const userId = getRouterParam(event, 'id')

  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'User ID required' })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      integrations: {
        select: {
          id: true,
          provider: true,
          syncStatus: true,
          lastSyncAt: true,
          errorMessage: true
        }
      },
      accounts: {
        select: {
          provider: true
        }
      },
      _count: {
        select: {
          workouts: true,
          plannedWorkouts: true,
          nutrition: true,
          reports: true,
          chatParticipations: true
        }
      }
    }
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  // Aggregate LLM Usage
  const llmStats = await prisma.llmUsage.aggregate({
    where: { userId },
    _sum: {
      estimatedCost: true,
      totalTokens: true
    },
    _count: {
      id: true
    }
  })

  // Get Last Workout
  const lastWorkout = await prisma.workout.findFirst({
    where: { userId },
    orderBy: { date: 'desc' },
    select: { date: true }
  })

  // Get Recent Workouts
  const recentWorkouts = await prisma.workout.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      date: true,
      type: true,
      source: true,
      tss: true,
      durationSec: true
    }
  })

  // Get Recent LLM Usage
  const recentLlmUsage = await prisma.llmUsage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      createdAt: true,
      model: true,
      operation: true,
      totalTokens: true,
      estimatedCost: true,
      success: true
    }
  })

  const recentEmailDeliveries = await prisma.emailDelivery.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      createdAt: true,
      toEmail: true,
      subject: true,
      templateKey: true,
      status: true,
      errorMessage: true
    }
  })

  const pendingEmailCount = await prisma.emailDelivery.count({
    where: {
      userId,
      status: {
        in: ['QUEUED', 'SENDING']
      }
    }
  })

  return {
    profile: user,
    stats: {
      totalCost: llmStats._sum.estimatedCost || 0,
      totalTokens: llmStats._sum.totalTokens || 0,
      totalCalls: llmStats._count.id || 0,
      lastActive: lastWorkout?.date || user.createdAt
    },
    recentWorkouts,
    recentLlmUsage,
    recentEmailDeliveries,
    emailStats: {
      pendingCount: pendingEmailCount
    }
  }
})
