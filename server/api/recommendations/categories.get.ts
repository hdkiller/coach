import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Recommendations'],
    summary: 'List unique recommendation categories'
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.email) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) throw createError({ statusCode: 404, message: 'User not found' })

  const categories = await prisma.recommendation.findMany({
    where: { userId: user.id },
    select: { category: true },
    distinct: ['category']
  })

  // Filter out nulls and sort
  return categories
    .map((c) => c.category)
    .filter(Boolean)
    .sort()
})
