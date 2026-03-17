import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  const userId = session.user.id

  const plan = await (prisma as any).trainingPlan.findUnique({
    where: { id, userId },
    include: {
      blocks: {
        orderBy: { order: 'asc' },
        include: {
          weeks: {
            orderBy: { weekNumber: 'asc' },
            include: {
              workouts: {
                orderBy: [{ weekIndex: 'asc' }, { dayIndex: 'asc' }]
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

  // Fallback: Compute indices if missing (for legacy templates not yet backfilled)
  let globalWeekCounter = 1
  for (const block of plan.blocks) {
    for (const week of block.weeks) {
      for (const workout of week.workouts) {
        if (workout.dayIndex === null || workout.weekIndex === null) {
          const date = new Date(workout.date)
          const jsDay = date.getUTCDay()
          workout.dayIndex = jsDay === 0 ? 6 : jsDay - 1
          workout.weekIndex = globalWeekCounter
        }
      }
      globalWeekCounter++
    }
  }

  return plan
})
