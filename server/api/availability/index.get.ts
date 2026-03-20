import { requireAuth } from '../../utils/auth-guard'
import { availabilityRepository } from '../../utils/repositories/availabilityRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Availability'],
    summary: 'Get training availability',
    description: "Returns the user's weekly training availability preferences.",
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
                  dayOfWeek: { type: 'integer', description: '0=Sunday, 6=Saturday' },
                  morning: { type: 'boolean' },
                  afternoon: { type: 'boolean' },
                  evening: { type: 'boolean' },
                  indoorOnly: { type: 'boolean' },
                  outdoorOnly: { type: 'boolean' }
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
  const user = await requireAuth(event, ['availability:read'])
  const userId = user.id

  return availabilityRepository.getFullSchedule(userId)
})
