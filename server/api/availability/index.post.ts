import { getServerSession } from '../../utils/session'
import { availabilityRepository } from '../../utils/repositories/availabilityRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Availability'],
    summary: 'Update training availability',
    description: "Updates the user's weekly training availability preferences.",
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['availability'],
            properties: {
              availability: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['dayOfWeek'],
                  properties: {
                    dayOfWeek: { type: 'integer', description: '0=Sunday, 6=Saturday' },
                    morning: { type: 'boolean' },
                    afternoon: { type: 'boolean' },
                    evening: { type: 'boolean' },
                    indoorOnly: { type: 'boolean' },
                    outdoorOnly: { type: 'boolean' },
                    bikeAccess: { type: 'boolean' },
                    gymAccess: { type: 'boolean' },
                    slots: { type: 'array', items: { type: 'object' } }
                  }
                }
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
                success: { type: 'boolean' },
                count: { type: 'integer' }
              }
            }
          }
        }
      },
      400: { description: 'Invalid input' },
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
  const body = await readBody(event)

  // Validate input
  if (!Array.isArray(body.availability)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request: availability must be an array'
    })
  }

  const created = await availabilityRepository.updateSchedule(userId, body.availability)

  return {
    success: true,
    count: created.count
  }
})
