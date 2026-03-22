import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { assertWorkoutComparisonAccess } from '../../../utils/analyticsScope'
import { prisma } from '../../../utils/db'

const schema = z.object({
  comparison: z.object({
    type: z.literal('workouts'),
    mode: z.literal('stream'),
    workoutIds: z.array(z.string().min(1)).min(2),
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
  const sampledValues = indices.map((index) => valueStream[index] ?? null)

  return {
    labels: sampledAxis.map((value) => formatAlignmentLabel(value, alignment)),
    values: sampledValues
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid stream comparison configuration',
      data: result.error.issues
    })
  }

  const comparison = result.data.comparison
  const workoutIds = await assertWorkoutComparisonAccess(user.id, comparison.workoutIds)

  const workouts = await prisma.workout.findMany({
    where: { id: { in: workoutIds } },
    select: {
      id: true,
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

  const byId = new Map(workouts.map((workout) => [workout.id, workout]))
  const ordered = workoutIds.map((id) => byId.get(id)).filter(Boolean)

  const resolvedSeries = ordered
    .map((workout: any) => {
      const series = resolveAlignedSeries(workout.streams, comparison.field, comparison.alignment)
      if (!series) return null

      return {
        label: `${new Date(workout.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} · ${workout.title} · ${workout.user?.name || workout.user?.email || 'Athlete'}`,
        ...series
      }
    })
    .filter(Boolean)

  if (resolvedSeries.length === 0) {
    return {
      labels: [],
      datasets: [],
      unsupportedReason: `No ${comparison.field} stream data was available for the selected workouts.`
    }
  }

  const labels = resolvedSeries.reduce<string[]>(
    (longest, series: any) => (series.labels.length > longest.length ? series.labels : longest),
    []
  )

  return {
    labels,
    datasets: resolvedSeries.map((series: any) => ({
      label: series.label,
      data: labels.map((_, index) => series.values[index] ?? null),
      type: 'line'
    }))
  }
})
