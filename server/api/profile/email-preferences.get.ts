import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  let preferences = await prisma.emailPreference.findFirst({
    where: { userId: session.user.id }
  })

  if (!preferences) {
    preferences = await prisma.emailPreference.create({
      data: {
        userId: session.user.id
      }
    })
  }

  return preferences
})
