import { requireAuth } from '../../utils/auth-guard'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'List athletes',
    description: 'Returns the list of athletes coached by the authenticated user.',
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
                  name: { type: 'string' },
                  email: { type: 'string' },
                  status: { type: 'string' }
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
  const user = await requireAuth(event, ['coaching:read'])
  const coachId = user.id
  return await coachingRepository.getAthletesForCoach(coachId)
})
