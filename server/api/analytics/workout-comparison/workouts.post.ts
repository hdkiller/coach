import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { assertWorkoutComparisonAccess } from '../../../utils/analyticsScope'
import { prisma } from '../../../utils/db'

const schema = z.object({
  workoutIds: z.array(z.string().min(1)).min(1)
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid workout comparison selection',
      data: result.error.issues
    })
  }

  const workoutIds = await assertWorkoutComparisonAccess(user.id, result.data.workoutIds)

  const workouts = await prisma.workout.findMany({
    where: { id: { in: workoutIds } },
    select: {
      id: true,
      userId: true,
      title: true,
      type: true,
      date: true,
      durationSec: true,
      distanceMeters: true,
      tss: true,
      trainingLoad: true,
      averageWatts: true,
      normalizedPower: true,
      averageHr: true,
      user: {
        select: {
          name: true,
          email: true,
          image: true
        }
      }
    }
  })

  const byId = new Map(workouts.map((workout) => [workout.id, workout]))

  return workoutIds
    .map((id) => {
      const workout = byId.get(id)
      if (!workout) return null

      return {
        ...workout,
        athleteName: workout.user?.name || workout.user?.email || 'Athlete'
      }
    })
    .filter(Boolean)
})
