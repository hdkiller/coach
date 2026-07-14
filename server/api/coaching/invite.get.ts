import { requireAuth } from '../../utils/auth-guard'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'Get active invite',
    description: 'Returns the currently active coaching invite code for the authenticated athlete.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', nullable: true },
                code: { type: 'string', nullable: true },
                expiresAt: { type: 'string', format: 'date-time', nullable: true },
                status: { type: 'string' }
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
  const invite = await coachingRepository.getActiveInvite(user.id)

  return invite || { status: 'NONE' }
})
