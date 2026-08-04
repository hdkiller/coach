import { getServerSession } from '#auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session || !session.user || !session.user.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const userId = session.user.id

  try {
    const history = await prisma.checkIn.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        createdAt: true,
        trainingDifficulty: true,
        trainingLoad: true,
        trainingRecovery: true,
        trainingNutrition: true,
        trainingHydration: true,
        wellnessSleep: true,
        wellnessStress: true,
        personalFatigue: true,
        wellnessPainScore: true
      }
    })

    return history
  } catch (error: any) {
    console.error('Error fetching check-in history:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch check-in history.'
    })
  }
})
