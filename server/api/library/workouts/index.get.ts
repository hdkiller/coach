import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = session.user.id

  const templates = await (prisma as any).workoutTemplate.findMany({
    where: { userId },
    include: {
      folder: {
        select: {
          id: true,
          name: true,
          parentId: true
        }
      }
    },
    orderBy: [{ lastUsedAt: 'desc' }, { updatedAt: 'desc' }]
  })

  return templates
})
