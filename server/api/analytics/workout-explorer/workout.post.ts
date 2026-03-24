import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { assertSingleWorkoutAccess } from '../../../utils/analyticsScope'
import { prisma } from '../../../utils/db'

const schema = z.object({
  workoutId: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid workout explorer selection',
      data: result.error.issues
    })
  }

  const workoutId = await assertSingleWorkoutAccess(user.id, result.data.workoutId)

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId },
    select: {
      id: true,
      userId: true,
      title: true,
      type: true,
      source: true,
      date: true,
      durationSec: true,
      elapsedTimeSec: true,
      distanceMeters: true,
      elevationGain: true,
      tss: true,
      trainingLoad: true,
      averageWatts: true,
      maxWatts: true,
      normalizedPower: true,
      averageHr: true,
      maxHr: true,
      averageCadence: true,
      averageSpeed: true,
      calories: true,
      intensity: true,
      kilojoules: true,
      efficiencyFactor: true,
      decoupling: true,
      powerHrRatio: true,
      trimp: true,
      hrLoad: true,
      workAboveFtp: true,
      user: {
        select: {
          name: true,
          email: true,
          image: true
        }
      }
    }
  })

  if (!workout) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Workout not found'
    })
  }

  return {
    ...workout,
    athleteName: workout.user?.name || workout.user?.email || 'Athlete'
  }
})
