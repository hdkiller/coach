import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userId = session.user.id

  const query = getQuery(event)
  const limit = Math.min(parseInt(query.limit as string) || 20, 100)
  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const skip = (page - 1) * limit

  const [notifications, total] = await Promise.all([
    prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip
    }),
    prisma.userNotification.count({ where: { userId } })
  ])

  const unreadCount = await prisma.userNotification.count({
    where: { userId, read: false }
  })

  return {
    notifications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    unreadCount
  }
})
