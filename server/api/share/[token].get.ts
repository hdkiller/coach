import { workoutRepository } from '../../utils/repositories/workoutRepository'
import { nutritionRepository } from '../../utils/repositories/nutritionRepository'
import { sanitizeSharedNutrition, sanitizeSharedPlannedWorkout } from '../../utils/share-response'

defineRouteMeta({
  openAPI: {
    tags: ['Public'],
    summary: 'Get shared resource',
    description: 'Returns details of a shared resource via token.',
    parameters: [
      {
        name: 'token',
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
            schema: {
              type: 'object',
              properties: {
                resourceType: { type: 'string' },
                data: { type: 'object' },
                user: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', nullable: true },
                    image: { type: 'string', nullable: true }
                  }
                }
              }
            }
          }
        }
      },
      404: { description: 'Share link not found or expired' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Share token is required'
    })
  }

  const shareToken = await prisma.shareToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          name: true,
          image: true,
          weightUnits: true
        }
      }
    }
  })

  if (!shareToken) {
    throw createError({
      statusCode: 404,
      message: 'Share link not found'
    })
  }

  // Check expiration
  if (shareToken.expiresAt && new Date() > shareToken.expiresAt) {
    throw createError({
      statusCode: 410,
      message: 'Share link has expired'
    })
  }

  let data: any = null

  if (shareToken.resourceType === 'REPORT') {
    data = await prisma.report.findUnique({
      where: { id: shareToken.resourceId }
    })
  } else if (shareToken.resourceType === 'WORKOUT') {
    data = await workoutRepository.getById(shareToken.resourceId, shareToken.userId, {
      include: {
        streams: true
      }
    })
  } else if (shareToken.resourceType === 'NUTRITION') {
    const nutrition = await nutritionRepository.getByIdInternal(shareToken.resourceId)
    data = nutrition ? sanitizeSharedNutrition(nutrition) : null
  } else if (shareToken.resourceType === 'ATHLETE_PROFILE') {
    data = await prisma.report.findUnique({
      where: { id: shareToken.resourceId }
    })
  } else if (shareToken.resourceType === 'PLANNED_WORKOUT') {
    const plannedWorkout = await prisma.plannedWorkout.findUnique({
      where: { id: shareToken.resourceId },
      include: {
        trainingWeek: {
          include: {
            block: {
              include: {
                plan: {
                  include: {
                    goal: true
                  }
                }
              }
            }
          }
        }
      }
    })
    data = plannedWorkout
      ? sanitizeSharedPlannedWorkout(plannedWorkout, shareToken.accessMode)
      : null
  } else if (shareToken.resourceType === 'TRAINING_PLAN') {
    data = await prisma.trainingPlan.findUnique({
      where: { id: shareToken.resourceId },
      include: {
        goal: true,
        blocks: {
          orderBy: { order: 'asc' },
          include: {
            weeks: {
              orderBy: { weekNumber: 'asc' },
              include: {
                workouts: {
                  orderBy: { date: 'asc' }
                }
              }
            }
          }
        }
      }
    })

    if (data && data.blocks) {
      const workoutIds: string[] = []

      data.blocks.forEach((block: any) => {
        block.weeks.forEach((week: any) => {
          week.workouts.forEach((workout: any) => {
            workoutIds.push(workout.id)
          })
        })
      })

      const existingTokens = await prisma.shareToken.findMany({
        where: {
          resourceType: 'PLANNED_WORKOUT',
          resourceId: { in: workoutIds }
        }
      })

      const tokenMap = new Map(existingTokens.map((t) => [t.resourceId, t.token]))

      data.blocks.forEach((block: any) => {
        block.weeks.forEach((week: any) => {
          week.workouts.forEach((workout: any) => {
            const token = tokenMap.get(workout.id)
            if (token) {
              workout.shareToken = { token }
            }
          })
        })
      })
    }
  } else if (shareToken.resourceType === 'WELLNESS') {
    data = await prisma.wellness.findUnique({
      where: { id: shareToken.resourceId }
    })
  }

  if (!data) {
    throw createError({
      statusCode: 404,
      message: 'Shared resource no longer exists'
    })
  }

  return {
    resourceType: shareToken.resourceType,
    data,
    user: shareToken.user
  }
})
