import { getServerSession } from '../../utils/session'
import { workoutRepository } from '../../utils/repositories/workoutRepository'
import { nutritionRepository } from '../../utils/repositories/nutritionRepository'
import { plannedWorkoutRepository } from '../../utils/repositories/plannedWorkoutRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Share'],
    summary: 'Generate share token',
    description: 'Generates a share token for a specific resource.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['resourceType', 'resourceId'],
            properties: {
              resourceType: {
                type: 'string',
                enum: [
                  'WORKOUT',
                  'REPORT',
                  'NUTRITION',
                  'PLANNED_WORKOUT',
                  'TRAINING_PLAN',
                  'WELLNESS',
                  'CHAT_ROOM'
                ]
              },
              resourceId: { type: 'string' },
              expiresIn: {
                type: ['number', 'null'],
                description: 'Expiration in seconds. Null creates a non-expiring link.'
              },
              forceNew: {
                type: 'boolean',
                description: 'Force a new token instead of reusing the latest active token.'
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                url: { type: 'string' }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' },
      404: { description: 'Resource not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  if (!userId) {
    throw createError({ statusCode: 401, message: 'User ID not found in session' })
  }
  const { resourceType, resourceId, expiresIn, forceNew } = await readBody(event)

  if (!resourceType || !resourceId) {
    throw createError({ statusCode: 400, message: 'Missing resourceType or resourceId' })
  }

  // Verify resource existence and ownership
  let resourceExists = false
  if (resourceType === 'REPORT') {
    const report = await prisma.report.findFirst({
      where: { id: resourceId, userId }
    })
    resourceExists = !!report
  } else if (resourceType === 'WORKOUT') {
    const workout = await workoutRepository.getById(resourceId, userId)
    resourceExists = !!workout
  } else if (resourceType === 'NUTRITION') {
    const nutrition = await nutritionRepository.getById(resourceId, userId)
    resourceExists = !!nutrition
  } else if (resourceType === 'PLANNED_WORKOUT') {
    const planned = await plannedWorkoutRepository.getById(resourceId, userId)
    resourceExists = !!planned
  } else if (resourceType === 'TRAINING_PLAN') {
    const plan = await prisma.trainingPlan.findFirst({
      where: { id: resourceId, userId }
    })
    resourceExists = !!plan
  } else if (resourceType === 'WELLNESS') {
    const wellness = await prisma.wellness.findFirst({
      where: { id: resourceId, userId }
    })
    resourceExists = !!wellness
  } else if (resourceType === 'CHAT_ROOM') {
    const room = await prisma.chatRoom.findFirst({
      where: {
        id: resourceId,
        users: { some: { userId } },
        deletedAt: null
      }
    })
    resourceExists = !!room
  }

  if (!resourceExists) {
    throw createError({ statusCode: 404, message: 'Resource not found or access denied' })
  }

  const defaultExpirySeconds = 30 * 24 * 60 * 60
  const normalizedExpiresIn =
    expiresIn === null
      ? null
      : typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0
        ? Math.floor(expiresIn)
        : defaultExpirySeconds
  const now = new Date()

  // Reuse existing active token for this resource.
  let shareToken = null
  if (!forceNew) {
    shareToken = await prisma.shareToken.findFirst({
      where: {
        userId,
        resourceType,
        resourceId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  if (!shareToken) {
    shareToken = await prisma.shareToken.create({
      data: {
        userId,
        resourceType,
        resourceId,
        expiresAt:
          normalizedExpiresIn === null ? null : new Date(now.getTime() + normalizedExpiresIn * 1000)
      }
    })
  }

  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl || 'http://localhost:3000'
  let sharePath = ''

  switch (resourceType) {
    case 'REPORT':
      sharePath = '/share/profile'
      break
    case 'WORKOUT':
      sharePath = '/share/workouts'
      break
    case 'NUTRITION':
      sharePath = '/share/nutrition'
      break
    case 'PLANNED_WORKOUT':
      sharePath = '/share/planned-workout'
      break
    case 'TRAINING_PLAN':
      sharePath = '/share/plan'
      break
    case 'WELLNESS':
      sharePath = '/share/wellness'
      break
    case 'CHAT_ROOM':
      sharePath = '/share/chat'
      break
    default:
      sharePath = `/share/${resourceType.toLowerCase()}`
  }

  return {
    token: shareToken.token,
    url: `${siteUrl}${sharePath}/${shareToken.token}`
  }
})
