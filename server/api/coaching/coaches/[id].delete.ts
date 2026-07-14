import { requireAuth } from '../../../utils/auth-guard'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'Remove coach',
    description: 'Removes a coaching relationship, disconnecting from the specified coach.',
    inputSchema: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'The ID of the coach to remove'
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
      404: { description: 'Coach not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const coachId = getRouterParam(event, 'id')

  if (!coachId) {
    throw createError({ statusCode: 400, message: 'Coach ID is required' })
  }

  const result = await coachingRepository.removeRelationship(coachId, user.id)
  if (result.count === 0) {
    throw createError({ statusCode: 404, message: 'Coaching relationship not found' })
  }

  return { success: true }
})
