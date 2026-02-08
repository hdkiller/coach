import { prisma } from '../../utils/db'
import { getUserNutritionSettings } from '../../utils/nutrition/settings'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id

  const settings = await getUserNutritionSettings(userId)

  return {
    settings
  }
})
