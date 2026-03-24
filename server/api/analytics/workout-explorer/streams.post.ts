import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { assertSingleWorkoutAccess } from '../../../utils/analyticsScope'
import { prisma } from '../../../utils/db'
import { lttb } from '../../../utils/analytics/lttb'
import { calculateVirtualStream, type VirtualField } from '../../../utils/analytics/virtual-streams'
import { sportSettingsRepository } from '../../../utils/repositories/sportSettingsRepository'

const schema = z.object({
  analysis: z.object({
    type: z.literal('single_workout'),
    mode: z.literal('stream'),
    workoutId: z.string().min(1),
    alignment: z.enum(['elapsed_time', 'distance', 'percent_complete']).default('elapsed_time'),
    field: z.string().default('watts'), // Can be raw field or virtual field
    limit: z.number().int().min(10).max(2000).default(1000),
    range: z
      .object({
        start: z.number(),
        end: z.number(),
        alignment: z.enum(['elapsed_time', 'distance']).default('elapsed_time')
      })
      .nullable()
      .optional()
  })
})

function toNumberArray(stream: unknown): number[] {
  if (!Array.isArray(stream)) return []
  return stream.map((value) => {
    const numeric = Number(value)
    return Number.isNaN(numeric) ? 0 : numeric
  })
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

  const { analysis } = result.data
  const workoutId = await assertSingleWorkoutAccess(user.id, analysis.workoutId)

  // 1. Fetch Workout and Streams
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId },
    select: {
      title: true,
      date: true,
      type: true,
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
          grade: true,
          latlng: true
        }
      }
    }
  })

  if (!workout || !workout.streams) {
    throw createError({ statusCode: 404, statusMessage: 'Workout streams not found' })
  }

  const rawStreams = {
    time: toNumberArray(workout.streams.time),
    distance: toNumberArray(workout.streams.distance),
    watts: toNumberArray(workout.streams.watts),
    heartrate: toNumberArray(workout.streams.heartrate),
    cadence: toNumberArray(workout.streams.cadence),
    velocity: toNumberArray(workout.streams.velocity),
    altitude: toNumberArray(workout.streams.altitude),
    grade: toNumberArray(workout.streams.grade)
  }

  // 2. Resolve requested field (raw or virtual)
  let values: number[] = []
  const rawFields = ['watts', 'heartrate', 'cadence', 'velocity', 'altitude', 'grade']

  if (rawFields.includes(analysis.field)) {
    values = rawStreams[analysis.field as keyof typeof rawStreams] || []
    if (analysis.field === 'velocity') {
      values = values.map((v) => Number((v * 3.6).toFixed(1))) // m/s to km/h
    }
  } else {
    // Check if it's a virtual field
    const sportSettings = await sportSettingsRepository.getForActivityType(
      user.id,
      workout.type || 'Cycling'
    )
    const ftp = sportSettings?.ftp || 200
    const wPrime = sportSettings?.wPrime || 20000

    values = calculateVirtualStream(analysis.field as VirtualField, rawStreams, {
      ftp,
      w_prime: wPrime
    })
  }

  if (values.length === 0) {
    return {
      labels: [],
      datasets: [],
      unsupportedReason: `No ${analysis.field} data was available for this workout.`
    }
  }

  // 3. Resolve Alignment Axis
  let axis: number[] = []
  if (analysis.alignment === 'elapsed_time') {
    axis = rawStreams.time
  } else if (analysis.alignment === 'distance') {
    axis = rawStreams.distance
  } else {
    axis = values.map((_, i) => (i / (values.length - 1)) * 100)
  }

  // 4. Combine and Crop if range is provided
  interface Point {
    x: number
    y: number
    lat?: number
    lng?: number
  }
  let dataPoints: Point[] = axis.map((x, i) => ({ x, y: values[i] || 0 }))

  if (analysis.range) {
    const { start, end } = analysis.range
    dataPoints = dataPoints.filter((p) => p.x >= start && p.x <= end)
  }

  // Include lat/lng if available for map synchronization
  const latlng = workout.streams.latlng as any[]
  if (Array.isArray(latlng) && latlng.length === axis.length) {
    // We need to map latlng back to the potentially cropped dataPoints
    // The easiest way is to do it BEFORE filtering, or using the original index
    const fullPoints: Point[] = axis.map((x, i) => {
      const p: Point = { x, y: values[i] || 0 }
      const coord = latlng[i]
      if (Array.isArray(coord) && coord.length >= 2) {
        p.lat = coord[0]
        p.lng = coord[1]
      }
      return p
    })

    if (analysis.range) {
      const { start, end } = analysis.range
      dataPoints = fullPoints.filter((p) => p.x >= start && p.x <= end)
    } else {
      dataPoints = fullPoints
    }
  }

  const sampledPoints = lttb(
    dataPoints,
    analysis.limit,
    (p) => p.x,
    (p) => p.y
  )

  const athleteLabel = workout.user?.name || workout.user?.email || 'Athlete'

  return {
    labels: sampledPoints.map((p) => formatAlignmentLabel(p.x, analysis.alignment)),
    datasets: [
      {
        label: `${new Date(workout.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} · ${workout.title} · ${athleteLabel}`,
        data: sampledPoints,
        type: 'line',
        showLine: true,
        pointRadius: 0
      }
    ],
    // Metadata for frontend map/interaction
    meta: {
      field: analysis.field,
      alignment: analysis.alignment,
      workoutId: analysis.workoutId,
      hasGPS: Array.isArray(latlng) && latlng.length > 0
    }
  }
})
