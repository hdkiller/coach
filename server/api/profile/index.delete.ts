import { getServerSession } from '../../utils/session'
import { scheduleAccountDeletion } from '../../utils/services/accountDeletionService'

defineRouteMeta({
  openAPI: {
    tags: ['Profile'],
    summary: 'Delete user account',
    description: 'Permanently deletes the user account and all associated data.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                jobId: { type: 'string' },
                message: { type: 'string' }
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

  if (session.user.isImpersonating || session.user.isCoaching) {
    throw createError({
      statusCode: 403,
      message: 'Account deletion is disabled while acting on behalf of another user'
    })
  }

  return await scheduleAccountDeletion({
    userId: session.user.id,
    actor: {
      type: 'self',
      id: session.user.id,
      email: session.user.email
    },
    event
  })
})
