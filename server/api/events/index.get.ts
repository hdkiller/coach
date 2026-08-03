import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Events'],
    summary: 'List events',
    description:
      'Returns a list of racing/life events for the authenticated user (session or Bearer with goal:read).',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  date: { type: 'string', format: 'date-time' },
                  type: { type: 'string' },
                  subType: { type: 'string' },
                  distance: { type: 'number' },
                  elevation: { type: 'integer' },
                  expectedDuration: { type: 'number' },
                  terrain: { type: 'string' },
                  source: { type: 'string' }
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
  const user = await requireAuth(event, ['goal:read'])

  try {
    const events = await prisma.event.findMany({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
      include: {
        goals: true,
        participants: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    return events
  } catch (error) {
    console.error('Error fetching events:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch events'
    })
  }
})
