import { getUserNutritionSettings } from '../../utils/nutrition/settings'
import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userId = session.user.id

  const [settings, user] = await Promise.all([
    getUserNutritionSettings(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { weight: true }
    })
  ])

  return {
    settings: {
      ...settings,
      user: {
        weight: user?.weight || 75
      }
    }
  }
})
