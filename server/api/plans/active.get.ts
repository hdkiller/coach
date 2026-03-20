import { requireAuth } from '../../utils/auth-guard'
import { trainingPlanRepository } from '../../utils/repositories/trainingPlanRepository'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['plan:read'])

  const plan = await trainingPlanRepository.getActive(user.id, {
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
