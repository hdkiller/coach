import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Recommendations'],
    summary: 'Get recommendation details',
    description: 'Get details of a specific recommendation.',
    responses: {
      200: { description: 'Success' },
      404: { description: 'Not found' },
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

  const rec = await prisma.recommendation.findUnique({
    where: { id, userId: user.id }
  })

  if (!rec) {
    throw createError({ statusCode: 404, message: 'Recommendation not found' })
  }

  return rec
})
