import { getServerSession } from '../../utils/session'
import { tasks } from '@trigger.dev/sdk/v3'
import { publishTaskRunStartedEvent } from '../../utils/task-run-events'

defineRouteMeta({
  openAPI: {
    tags: ['Scores'],
    summary: 'Generate score explanations',
    description: 'Triggers a background job to generate explanations for all score trends.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                jobId: { type: 'string' }
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
      message: 'Unauthorized'
    })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  try {
    // Trigger the batch explanation generation job with per-user concurrency
    const handle = await tasks.trigger(
      'generate-score-explanations',
      { userId: user.id, force: true },
      {
        concurrencyKey: user.id,
        tags: [`user:${user.id}`]
      }
    )

    await publishTaskRunStartedEvent(user.id, 'generate-score-explanations', handle)

    return {
      success: true,
      message: 'Score explanation generation started',
      jobId: handle.id
    }
  } catch (error: any) {
    console.error('Error triggering score explanations:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to trigger score explanation generation'
    })
  }
})
