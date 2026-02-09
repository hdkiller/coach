import { getUserNutritionSettings } from '../../utils/nutrition/settings'
import { getServerSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userId = session.user.id

  const settings = await getUserNutritionSettings(userId)

  return {
    settings
  }
})
