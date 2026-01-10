import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { tasks } from '@trigger.dev/sdk/v3'

defineRouteMeta({
  openAPI: {
    tags: ['Recommendations'],
    summary: 'Generate implementation guide',
    description:
      'Triggers AI generation of a structured implementation guide for a recommendation.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
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
  const id = getRouterParam(event, 'id')

  if (!session?.user?.email) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  })

  if (!user) throw createError({ statusCode: 404, message: 'User not found' })

  // Trigger the generation task
  const handle = await tasks.trigger(
    'generate-implementation-guide',
    {
      userId: user.id,
      recommendationId: id!
    },
    { concurrencyKey: user.id }
  )

  return {
    success: true,
    jobId: handle.id
  }
})
