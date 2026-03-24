import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { assertSingleWorkoutAccess } from '../../../utils/analyticsScope'
import { prisma } from '../../../utils/db'

const schema = z.object({
  analysis: z.object({
    type: z.literal('single_workout'),
    mode: z.literal('stream'),
    workoutId: z.string().min(1),
    alignment: z.enum(['elapsed_time', 'distance', 'percent_complete']).default('elapsed_time'),
    field: z
      .enum(['watts', 'heartrate', 'cadence', 'velocity', 'altitude', 'grade'])
      .default('watts')
  })
})

function toNumberArray(stream: unknown) {
  if (!Array.isArray(stream)) return []
  return stream
    .map((value) => {
      const numeric = Number(value)
      return Number.isNaN(numeric) ? null : numeric
    })
    .filter((value): value is number => value !== null)
}

function evenlySampleIndices(length: number, targetPoints: number) {
  if (length <= targetPoints) {
    return Array.from({ length }, (_, index) => index)
  }

  const step = length / targetPoints
  return Array.from({ length: targetPoints }, (_, index) =>
    Math.min(length - 1, Math.floor(index * step))
  )
}

function formatAlignmentLabel(
  value: number,
  alignment: 'elapsed_time' | 'distance' | 'percent_complete'
) {
  if (alignment === 'elapsed_time') {
    if (value >= 3600) return `${(value / 3600).toFixed(1)}h`
    if (value >= 60) return `${Math.round(value / 60)}m`
    return `${Math.round(value)}s`
  }

  if (alignment === 'distance') {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}km`
    return `${Math.round(value)}m`
  }

  return `${Math.round(value)}%`
}

function resolveAlignedSeries(
  workoutStream: any,
  field: 'watts' | 'heartrate' | 'cadence' | 'velocity' | 'altitude' | 'grade',
  alignment: 'elapsed_time' | 'distance' | 'percent_complete'
) {
  const valueStream = toNumberArray(workoutStream?.[field])
  if (valueStream.length === 0) return null

  let axisStream: number[] = []

  if (alignment === 'elapsed_time') {
    axisStream = toNumberArray(workoutStream?.time)
  } else if (alignment === 'distance') {
    axisStream = toNumberArray(workoutStream?.distance)
  } else {
    axisStream = Array.from({ length: valueStream.length }, (_, index) =>
      valueStream.length === 1 ? 100 : (index / (valueStream.length - 1)) * 100
    )
  }

  if (axisStream.length === 0) return null

  const indices = evenlySampleIndices(Math.min(axisStream.length, valueStream.length), 180)
  const sampledAxis = indices.map((index) => axisStream[index] ?? 0)
  const sampledValues = indices.map((index) => {
    const rawValue = valueStream[index]
    if (rawValue === null || rawValue === undefined) return null
    if (field === 'velocity') return Number((rawValue * 3.6).toFixed(1))
    return rawValue
  })

  return {
    labels: sampledAxis.map((value) => formatAlignmentLabel(value, alignment)),
    points: sampledAxis.map((value, index) => ({
      x: Number(value.toFixed(2)),
      y: sampledValues[index] ?? null
    }))
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid workout explorer stream configuration',
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
          time: true,
          distance: true,
          watts: true,
          heartrate: true,
          cadence: true,
          velocity: true,
          altitude: true,
          grade: true
        }
      }
    }
  })

  if (!workout) {
    throw createError({ statusCode: 404, statusMessage: 'Workout not found' })
  }

  const series = resolveAlignedSeries(workout.streams, analysis.field, analysis.alignment)
  if (!series) {
    return {
      labels: [],
      datasets: [],
      unsupportedReason: `No ${analysis.field} stream data was available for this workout.`
    }
  }

  const athleteLabel = workout.user?.name || workout.user?.email || 'Athlete'

  return {
    labels: series.labels,
    datasets: [
      {
        label: `${new Date(workout.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} · ${workout.title} · ${athleteLabel}`,
        data: series.points.filter((point) => point.y !== null),
        type: 'line',
        showLine: true,
        pointRadius: 0
      }
    ]
  }
})
