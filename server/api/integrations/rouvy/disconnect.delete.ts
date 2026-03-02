import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  const integration = await prisma.integration.findFirst({
    where: {
      userId: user.id,
      provider: 'rouvy'
    }
  })

  if (!integration) {
    throw createError({
      statusCode: 404,
      message: 'ROUVY integration not found'
    })
  }

  await prisma.integration.delete({
    where: { id: integration.id }
  })

  return {
    message: 'ROUVY disconnected successfully'
  }
})
