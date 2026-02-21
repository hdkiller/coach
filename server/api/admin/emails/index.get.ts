import { prisma } from '../../../utils/db'
import { getServerSession } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 20
  const userId = typeof query.userId === 'string' && query.userId.length > 0 ? query.userId : null

  const skip = (page - 1) * limit
  const where = userId ? { userId } : undefined

  const [deliveries, total] = await Promise.all([
    prisma.emailDelivery.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } }
      }
    }),
    prisma.emailDelivery.count({ where })
  ])

  return {
    deliveries,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  }
})
