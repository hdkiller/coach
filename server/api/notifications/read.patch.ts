import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userId = session.user.id

  const body = await readBody(event)
  const { id, all } = body

  if (all) {
    await prisma.userNotification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    })
    return { success: true }
  }

  if (id) {
    await prisma.userNotification.update({
      where: { id, userId },
      data: { read: true }
    })
    return { success: true }
  }

  throw createError({
    statusCode: 400,
    message: 'Either id or all parameter must be provided'
  })
})
