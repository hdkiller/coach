import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing workout template ID' })
  }

  const template = await (prisma as any).workoutTemplate.findUnique({
    where: {
      id,
      userId: session.user.id
    }
  })

  if (!template) {
    throw createError({ statusCode: 404, message: 'Workout template not found' })
  }

  // Get user FTP for scaling/display
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { ftp: true, lthr: true }
  })

  return {
    template,
    userFtp: user?.ftp,
    userLthr: user?.lthr
  }
})
