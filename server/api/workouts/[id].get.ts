import { getServerSession } from '../../utils/session'
import { sportSettingsRepository } from '../../utils/repositories/sportSettingsRepository'
import {
  buildWorkoutAnalysisFacts,
  buildWorkoutAnalysisFactsV2
} from '../../utils/workout-analysis-facts'

defineRouteMeta({
  openAPI: {
    tags: ['Workouts'],
    summary: 'Get workout details',
    description: 'Returns the full details for a specific workout.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Workout' }
          }
        }
      },
      404: { description: 'Workout not found' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Workout ID is required'
    })
  }

  const workout = await workoutRepository.getById(id, (session.user as any).id, {
    include: {
      streams: true,
      oauthApp: {
        select: {
          id: true,
          name: true,
          sourceName: true,
          clientId: true
        }
      },
      duplicates: true,
      canonicalWorkout: true,
      plannedWorkout: true,
      planAdherence: true,
      metricHistory: {
        orderBy: { createdAt: 'desc' }
      },
      personalBests: true,
      exercises: {
        include: {
          exercise: true,
          sets: {
            orderBy: {
              order: 'asc'
            }
          }
        },
        orderBy: {
          order: 'asc'
        }
      }
    }
  })

  if (!workout) {
    throw createError({
      statusCode: 404,
      message: 'Workout not found'
    })
  }

  // Find associated LLM usage
  const llmUsage = await prisma.llmUsage.findFirst({
    where: {
      entityId: workout.id,
      entityType: 'Workout'
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      feedback: true,
      feedbackText: true
    }
  })

  // Find neighbors (excluding duplicates)
  const [prevWorkout, nextWorkout] = await Promise.all([
    prisma.workout.findFirst({
      where: {
        userId: (session.user as any).id,
        date: { lt: workout.date },
        isDuplicate: false
      },
      orderBy: { date: 'desc' },
      select: { id: true }
    }),
    prisma.workout.findFirst({
      where: {
        userId: (session.user as any).id,
        date: { gt: workout.date },
        isDuplicate: false
      },
      orderBy: { date: 'asc' },
      select: { id: true }
    })
  ])

  const [sportSettings, userProfile] = await Promise.all([
    sportSettingsRepository.getForActivityType((session.user as any).id, workout.type || ''),
    prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: {
        weight: true,
        weightUnits: true,
        language: true
      }
    })
  ])

  const analysisFacts = buildWorkoutAnalysisFacts({
    workout: workout as any,
    sportSettings,
    plannedWorkout: (workout as any).plannedWorkout,
    userProfile: userProfile || undefined
  })
  const analysisFactsV2 = buildWorkoutAnalysisFactsV2({
    workout: workout as any,
    sportSettings,
    plannedWorkout: (workout as any).plannedWorkout,
    userProfile: userProfile || undefined
  })

  return {
    ...workout,
    analysisFacts,
    analysisFactsV2,
    llmUsageId: llmUsage?.id,
    feedback: llmUsage?.feedback,
    feedbackText: llmUsage?.feedbackText,
    prevWorkoutId: prevWorkout?.id,
    nextWorkoutId: nextWorkout?.id
  }
})
