import { getServerSession } from '../../utils/session'
import { bodyMetricResolver } from '../../utils/services/bodyMetricResolver'

defineRouteMeta({
  openAPI: {
    tags: ['Goals'],
    summary: 'List user goals',
    description: 'Returns all goals for the authenticated user.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                goals: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      type: { type: 'string' },
                      title: { type: 'string' },
                      description: { type: 'string', nullable: true },
                      metric: { type: 'string', nullable: true },
                      targetValue: { type: 'number', nullable: true },
                      currentValue: { type: 'number', nullable: true },
                      targetDate: { type: 'string', format: 'date-time', nullable: true },
                      status: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        goals: {
          orderBy: { createdAt: 'desc' },
          include: { events: true }
        }
      }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    const effectiveWeight = await bodyMetricResolver.resolveEffectiveWeight(user.id, {
      weight: user.weight,
      weightSourceMode: (user as any).weightSourceMode,
      weightUnits: user.weightUnits
    })

    // Dynamic update for Body Composition and FTP goals to ensure fresh UI
    const goals = user.goals.map((goal) => {
      // Create a shallow copy to modify
      const g = { ...goal }

      // Update weight goals if profile weight is different from stored currentValue
      if (
        (g.metric === 'weight_kg' || g.type === 'BODY_COMPOSITION') &&
        effectiveWeight.value &&
        g.currentValue !== effectiveWeight.value
      ) {
        g.currentValue = effectiveWeight.value
      }

      // Update FTP goals if profile FTP is different from stored currentValue
      if (
        (g.metric === 'FTP (Watts)' || g.title?.toLowerCase().includes('ftp')) &&
        user.ftp &&
        g.currentValue !== user.ftp
      ) {
        g.currentValue = user.ftp
      }

      return g
    })

    return {
      success: true,
      goals
    }
  } catch (error) {
    console.error('Error fetching goals:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch goals'
    })
  }
})
