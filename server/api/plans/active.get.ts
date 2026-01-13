import { prisma } from '../../utils/db'
import { getServerSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.email) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, ftp: true }
  })

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const plan = await prisma.trainingPlan.findFirst({
    where: {
      userId: user.id,
      status: 'ACTIVE'
    },
    include: {
      goal: true,
      blocks: {
        orderBy: { order: 'asc' },
        include: {
          weeks: {
            orderBy: { weekNumber: 'asc' },
            include: {
              workouts: {
                orderBy: { date: 'asc' }
              }
            }
          }
        }
      }
    }
  })

  return { plan, userFtp: user.ftp }
})
