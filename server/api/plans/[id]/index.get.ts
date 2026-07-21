import { requireAuth } from '../../../utils/auth-guard'
import { trainingPlanRepository } from '../../../utils/repositories/trainingPlanRepository'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['plan:read'])
  const userId = user.id
  const planId = getRouterParam(event, 'id')

  if (!planId) {
    throw createError({ statusCode: 400, message: 'Plan ID is required' })
  }

  const plan = await trainingPlanRepository.getById(planId, userId, {
    include: {
      goal: {
        include: { events: true }
      },
      blocks: {
        orderBy: { order: 'asc' },
        include: {
          weeks: {
            orderBy: { weekNumber: 'asc' },
            include: {
              workouts: {
                orderBy: { date: 'asc' },
                include: {
                  completedWorkouts: { select: { id: true } }
                }
              }
            }
          }
        }
      }
    }
  })

  if (!plan) {
    throw createError({ statusCode: 404, message: 'Plan not found' })
  }

  return plan
})
