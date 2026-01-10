import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { tasks } from '@trigger.dev/sdk/v3'

defineRouteMeta({
  openAPI: {
    tags: ['Recommendations'],
    summary: 'Generate recommendations',
    description:
      'Triggers a background job to generate recommendations based on existing score trends.',
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
    // Trigger the recommendation generation job
    const handle = await tasks.trigger(
      'generate-recommendations',
      { userId: user.id },
      {
        concurrencyKey: user.id,
        tags: [`user:${user.id}`]
      }
    )

    return {
      success: true,
      message: 'Recommendation generation started',
      jobId: handle.id
    }
  } catch (error: any) {
    console.error('Error triggering recommendations:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to trigger recommendation generation'
    })
  }
})
