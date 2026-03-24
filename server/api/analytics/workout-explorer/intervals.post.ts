import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { assertSingleWorkoutAccess } from '../../../utils/analyticsScope'
import { prisma } from '../../../utils/db'

const schema = z.object({
  analysis: z.object({
    type: z.literal('single_workout'),
    mode: z.literal('interval'),
    workoutId: z.string().min(1),
    field: z.enum(['avgPower', 'avgHr', 'duration', 'distance']).default('avgPower')
  })
})

function toLapArray(lapSplits: unknown) {
  return Array.isArray(lapSplits) ? lapSplits : []
}

function getLapMetric(split: any, field: 'avgPower' | 'avgHr' | 'duration' | 'distance') {
  const candidates =
    field === 'avgPower'
      ? [split.avgPower, split.avg_power, split.averageWatts, split.average_watts]
      : field === 'avgHr'
        ? [split.avgHr, split.avg_hr, split.averageHr, split.average_heartrate]
        : field === 'duration'
          ? [split.duration, split.elapsedTime, split.elapsed_time, split.movingTime]
          : [split.distance, split.distanceMeters, split.distance_meters]

  for (const candidate of candidates) {
    const value = Number(candidate)
    if (!Number.isNaN(value)) return value
  }

  return null
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid workout explorer interval configuration',
      data: result.error.issues
    })
  }

  const analysis = result.data.analysis
  const workoutId = await assertSingleWorkoutAccess(user.id, analysis.workoutId)

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId },
    select: {
      title: true,
      date: true,
      user: { select: { name: true, email: true } },
      streams: {
        select: {
          lapSplits: true
        }
      }
    }
  })

  if (!workout) {
    throw createError({ statusCode: 404, statusMessage: 'Workout not found' })
  }

  const splits = toLapArray(workout.streams?.lapSplits)
  if (splits.length === 0) {
    return {
      labels: [],
      datasets: [],
      unsupportedReason: 'No comparable lap or split data was available for this workout.'
    }
  }

  const values = splits.map((split) => getLapMetric(split, analysis.field))
  const labels = Array.from({ length: values.length }, (_, index) => `Lap ${index + 1}`)
  const athleteLabel = workout.user?.name || workout.user?.email || 'Athlete'

  return {
    labels,
    datasets: [
      {
        label: `${new Date(workout.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} · ${workout.title} · ${athleteLabel}`,
        data: labels.map((_, index) => values[index] ?? null),
        type: 'line'
      }
    ]
  }
})
