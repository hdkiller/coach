import { requireAuth } from '../../utils/auth-guard'
import { getUserLocalDate, getUserTimezone } from '../../utils/date'
import { metabolicService } from '../../utils/services/metabolicService'
import { nutritionRepository } from '../../utils/repositories/nutritionRepository'

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event, ['nutrition:write'])
  const userId = authUser.id
  const timezone = await getUserTimezone(userId)
  const today = getUserLocalDate(timezone)
  const state = await metabolicService.getMetabolicStateForDate(userId, today)

  await nutritionRepository.upsert(
    userId,
    today,
    {
      userId,
      date: today,
      startingGlycogenPercentage: state.startingGlycogen,
      startingFluidDeficit: 0
    },
    {
      startingGlycogenPercentage: state.startingGlycogen,
      startingFluidDeficit: 0
    }
  )

  return {
    success: true,
    date: today.toISOString().split('T')[0],
    hydrationDebtResetMl: 0
  }
})
