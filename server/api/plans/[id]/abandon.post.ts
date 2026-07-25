import { requireAuth } from '../../../utils/auth-guard'
import { prisma } from '../../../utils/db'
import { getUserLocalDate, getUserTimezone } from '../../../utils/date'
import { trainingPlanRepository } from '../../../utils/repositories/trainingPlanRepository'

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event, ['plan:write'])

  const userId = authUser.id
  const planId = getRouterParam(event, 'id')

  if (!planId) {
    throw createError({ statusCode: 400, message: 'Plan ID required' })
  }

  // 1. Verify ownership
  const plan = await trainingPlanRepository.getById(planId, userId)

  if (!plan) {
    throw createError({ statusCode: 404, message: 'Plan not found' })
  }

  // 2. Mark as ABANDONED
  await trainingPlanRepository.update(planId, userId, { status: 'ABANDONED' })

  // 3. Handle future planned workouts
  // We identify "future" by date > today in the user's local calendar context
  const timezone = await getUserTimezone(userId)
  const today = getUserLocalDate(timezone)

  const deleted = await trainingPlanRepository.cleanupWorkouts(userId, planId, today)

  return {
    success: true,
    message: 'Plan abandoned',
    deletedWorkouts: deleted.count
  }
})
