import { requireAuth } from '../../utils/auth-guard'
import { trainingPlanRepository } from '../../utils/repositories/trainingPlanRepository'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['plan:read'])
  const userId = user.id

  const plans = await trainingPlanRepository.list(userId, {
    // Custom filter for this specific list view
    include: {
      goal: { select: { title: true } },
      blocks: {
        select: {
          id: true,
          _count: { select: { weeks: true } }
        }
      },
      _count: { select: { blocks: true } }
    }
  })

  // Filter for non-active plans + templates as in original logic
  return plans.filter((p) => p.status !== 'ACTIVE' || p.isTemplate)
})
