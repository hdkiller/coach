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

  const skip = (page - 1) * limit

  const [deliveries, total] = await Promise.all([
    prisma.emailDelivery.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, name: true } }
      }
    }),
    prisma.emailDelivery.count()
  ])

  return {
    deliveries,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  }
})
