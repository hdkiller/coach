import { requireAuth } from '../../utils/auth-guard'
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
  const user = await requireAuth(event, ['workout:read'])

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Workout ID or Date is required'
    })
  }

  let workout: any = null

  // Check if ID is a date string (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(id)) {
    const dateObj = new Date(`${id}T00:00:00Z`)
    if (!isNaN(dateObj.getTime())) {
      // Find workouts for this date. If there are multiple, get the most recent one (non-duplicate).
      workout = await prisma.workout.findFirst({
        where: {
          userId: user.id,
          date: {
            gte: new Date(`${id}T00:00:00Z`),
            lte: new Date(`${id}T23:59:59Z`)
          },
          isDuplicate: false
        },
        orderBy: { createdAt: 'desc' },
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
          duplicates: {
            include: {
              oauthApp: {
                select: {
                  id: true,
                  name: true,
                  sourceName: true,
                  clientId: true
                }
              }
            }
          },
          canonicalWorkout: {
            include: {
              oauthApp: {
                select: {
                  id: true,
                  name: true,
                  sourceName: true,
                  clientId: true
                }
              }
            }
          },
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
    }
  }

  // Fallback to searching by UUID if not found by date or if not a date string
  if (!workout) {
    workout = await workoutRepository.getById(id, user.id, {
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
        duplicates: {
          include: {
            oauthApp: {
              select: {
                id: true,
                name: true,
                sourceName: true,
                clientId: true
              }
            }
          }
        },
        canonicalWorkout: {
          include: {
            oauthApp: {
              select: {
                id: true,
                name: true,
                sourceName: true,
                clientId: true
              }
            }
          }
        },
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
  }

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
        userId: user.id,
        date: { lt: workout.date },
        isDuplicate: false
      },
      orderBy: { date: 'desc' },
      select: { id: true }
    }),
    prisma.workout.findFirst({
      where: {
        userId: user.id,
        date: { gt: workout.date },
        isDuplicate: false
      },
      orderBy: { date: 'asc' },
      select: { id: true }
    })
  ])

  const [sportSettings, userProfile] = await Promise.all([
    sportSettingsRepository.getForActivityType(user.id, workout.type || ''),
    prisma.user.findUnique({
      where: { id: user.id },
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
