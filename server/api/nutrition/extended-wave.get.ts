import { getServerSession } from '../../utils/session'
import { metabolicService } from '../../utils/services/metabolicService'

defineRouteMeta({
  openAPI: {
    tags: ['Nutrition'],
    summary: 'Get extended metabolic wave',
    description: 'Returns a multi-day predictive energy wave (historical + current + future).',
    parameters: [
      {
        name: 'daysAhead',
        in: 'query',
        schema: { type: 'integer', default: 3 }
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
                success: { type: 'boolean' },
                points: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      time: { type: 'string' },
                      timestamp: { type: 'number' },
                      level: { type: 'number' },
                      kcalBalance: { type: 'number' },
                      carbBalance: { type: 'number' },
                      fluidDeficit: { type: 'number' },
                      dataType: { type: 'string' },
                      event: { type: 'string', nullable: true }
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

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const userId = (session.user as any).id
  const query = getQuery(event)
  const daysAhead = query.daysAhead ? parseInt(query.daysAhead as string) : 3

  try {
    const { points, journeyEvents } = await metabolicService.generateExtendedWave(userId, daysAhead)

    return {
      success: true,
      points,
      journeyEvents
    }
  } catch (error: any) {
    console.error('Error generating extended wave:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to generate extended metabolic wave'
    })
  }
})
