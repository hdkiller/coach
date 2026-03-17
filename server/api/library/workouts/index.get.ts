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
    orderBy: { updatedAt: 'desc' }
  })

  return templates
})
