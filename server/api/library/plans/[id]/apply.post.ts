import { z } from 'zod'
import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { requireCoachAccessToAthlete } from '../../../../utils/coaching-auth'
import {
  createPlannedWorkoutForUser,
  deletePlannedWorkoutForUser
} from '../../../../utils/planned-workout-service'

const applyPlanSchema = z.object({
  startDate: z.string(),
  athleteId: z.string().optional(),
  replaceFutureWorkouts: z.boolean().optional()
})

function normalizeStartDate(value: string) {
  const raw = new Date(value)
  if (Number.isNaN(raw.getTime())) {
    throw createError({ statusCode: 400, message: 'Invalid start date.' })
  }
  return new Date(Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate()))
}

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const planId = getRouterParam(event, 'id')
  if (!planId) {
    throw createError({ statusCode: 400, message: 'Plan ID is required.' })
  }

  const body = applyPlanSchema.parse(await readBody(event))
  const coachId = session.user.id
  const targetUserId = body.athleteId || coachId

  if (targetUserId !== coachId) {
    await requireCoachAccessToAthlete(event, targetUserId)
  }

  const template = await prisma.trainingPlan.findFirst({
    where: {
      id: planId,
      userId: coachId,
      isTemplate: true
    },
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

  if (!template) {
    throw createError({ statusCode: 404, message: 'Template not found.' })
  }

  const startDate = normalizeStartDate(body.startDate)
  let deletedCount = 0
  let createdCount = 0

  if (body.replaceFutureWorkouts) {
    const futureWorkouts = await prisma.plannedWorkout.findMany({
      where: {
        userId: targetUserId,
        completed: false,
        date: { gte: startDate }
      },
      select: { id: true }
    })

    for (const workout of futureWorkouts) {
      await deletePlannedWorkoutForUser(targetUserId, workout.id)
      deletedCount += 1
    }
  }

  for (const block of template.blocks) {
    let weeksBefore = 0
    for (const candidate of template.blocks) {
      if (candidate.order < block.order) weeksBefore += candidate.durationWeeks
    }

    const blockStartDate = new Date(startDate)
    blockStartDate.setUTCDate(blockStartDate.getUTCDate() + weeksBefore * 7)

    for (const week of block.weeks) {
      const weekStartDate = new Date(blockStartDate)
      weekStartDate.setUTCDate(weekStartDate.getUTCDate() + (week.weekNumber - 1) * 7)

      for (const workout of week.workouts) {
        const dayOffset =
          workout.dayIndex !== null && workout.dayIndex !== undefined
            ? workout.dayIndex
            : (() => {
                const jsDay = new Date(workout.date).getUTCDay()
                return jsDay === 0 ? 6 : jsDay - 1
              })()

        const workoutDate = new Date(weekStartDate)
        workoutDate.setUTCDate(workoutDate.getUTCDate() + dayOffset)

        await createPlannedWorkoutForUser(targetUserId, {
          date: workoutDate.toISOString(),
          startTime: workout.startTime,
          title: workout.title,
          description: workout.description || '',
          type: workout.type || 'Ride',
          category: workout.category || 'Workout',
          durationSec: workout.durationSec || 0,
          tss: workout.tss,
          workIntensity: workout.workIntensity,
          structuredWorkout: workout.structuredWorkout || undefined,
          fuelingStrategy: workout.fuelingStrategy || undefined
        })
        createdCount += 1
      }
    }
  }

  return {
    success: true,
    deletedCount,
    createdCount,
    targetUserId
  }
})
