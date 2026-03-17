import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  const userId = session.user.id

  const template = await (prisma as any).workoutTemplate.findUnique({
    where: { id, userId }
  })

  if (!template) {
    throw createError({ statusCode: 404, message: 'Template not found' })
  }

  await (prisma as any).workoutTemplate.delete({
    where: { id, userId }
  })

  return { success: true }
})
