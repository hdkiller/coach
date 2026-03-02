import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Disconnect Wahoo',
    description: 'Removes the Wahoo integration for the current user.',
    responses: {
      200: { description: 'Success' },
      401: { description: 'Unauthorized' },
      404: { description: 'Integration not found' }
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

  const integration = await prisma.integration.findFirst({
    where: {
      userId: user.id,
      provider: 'wahoo'
    }
  })

  if (!integration) {
    throw createError({
      statusCode: 404,
      message: 'Integration not found'
    })
  }

  await prisma.integration.delete({
    where: { id: integration.id }
  })

  return { success: true }
})
