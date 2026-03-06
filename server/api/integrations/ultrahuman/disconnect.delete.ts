import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Ultrahuman disconnect',
    description: 'Removes the Ultrahuman integration for the current user.',
    responses: {
      200: { description: 'Successfully disconnected' },
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

  await prisma.integration.deleteMany({
    where: {
      userId: user.id,
      provider: 'ultrahuman'
    }
  })

  return { success: true }
})
