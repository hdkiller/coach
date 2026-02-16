import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { sportSettingsRepository } from '../../../utils/repositories/sportSettingsRepository'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, ftp: true }
  })

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Workout ID is required' })
  }

  const workout = await prisma.plannedWorkout.findUnique({
    where: { id },
    include: {
      completedWorkouts: {
        select: {
          id: true,
          title: true,
          date: true,
          durationSec: true,
          tss: true,
          averageWatts: true,
          normalizedPower: true,
          averageHr: true,
          type: true
        }
      },
      trainingWeek: {
        select: {
          id: true,
          weekNumber: true,
          startDate: true,
          endDate: true,
          focus: true,
          block: {
            select: {
              id: true,
              name: true,
              type: true,
              primaryFocus: true,
              plan: {
                select: {
                  id: true,
                  goal: {
                    select: {
                      id: true,
                      title: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  if (!workout) {
    throw createError({ statusCode: 404, message: 'Planned workout not found' })
  }

  // Verify ownership
  if (workout.userId !== user.id) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Fetch most recent LLM usage for feedback
  const llmUsage = await prisma.llmUsage.findFirst({
    where: {
      entityId: id,
      entityType: 'PlannedWorkout',
      success: true
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      feedback: true,
      feedbackText: true
    }
  })

  // Fetch sport settings for this workout type
  const sportSettings = await sportSettingsRepository.getForActivityType(
    user.id,
    workout.type || ''
  )

  return {
    workout,
    userFtp: user.ftp,
    llmUsageId: llmUsage?.id,
    initialFeedback: llmUsage?.feedback,
    initialFeedbackText: llmUsage?.feedbackText,
    sportSettings
  }
})
