import { requireAuth } from '../../../utils/auth-guard'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'Remove athlete',
    description: 'Removes a coaching relationship, disconnecting from the specified athlete.',
    inputSchema: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'The ID of the athlete to remove'
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
                success: { type: 'boolean' }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' },
      404: { description: 'Athlete not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const athleteId = getRouterParam(event, 'id')

  if (!athleteId) {
    throw createError({ statusCode: 400, message: 'Athlete ID is required' })
  }

  const result = await coachingRepository.removeRelationship(user.id, athleteId)
  if (result.count === 0) {
    throw createError({ statusCode: 404, message: 'Coaching relationship not found' })
  }

  return { success: true }
})
