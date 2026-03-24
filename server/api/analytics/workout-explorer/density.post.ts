import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { assertSingleWorkoutAccess } from '../../../utils/analyticsScope'
import { prisma } from '../../../utils/db'

const schema = z.object({
  analysis: z.object({
    type: z.literal('single_workout'),
    mode: z.literal('density'),
    workoutId: z.string().min(1),
    xField: z.enum(['cadence', 'heartrate', 'velocity']).default('cadence'),
    yField: z.enum(['watts', 'torque']).default('watts'),
    xBins: z.number().int().min(5).max(100).default(40),
    yBins: z.number().int().min(5).max(100).default(40),
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

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid density analysis configuration',
      data: result.error.issues
    })
  }

  const { analysis } = result.data
  const workoutId = await assertSingleWorkoutAccess(user.id, analysis.workoutId)

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId },
    select: {
      streams: {
        select: {
          watts: true,
          cadence: true,
          heartrate: true,
          velocity: true
        }
      }
    }
  })

  if (!workout || !workout.streams) {
    throw createError({ statusCode: 404, statusMessage: 'Workout streams not found' })
  }

  const xRaw = toNumberArray(
    workout.streams[
      analysis.xField === 'cadence'
        ? 'cadence'
        : analysis.xField === 'heartrate'
          ? 'heartrate'
          : 'velocity'
    ]
  )
  const yRaw = toNumberArray(workout.streams[analysis.yField === 'watts' ? 'watts' : 'watts']) // TODO: handle torque calculation

  if (xRaw.length === 0 || yRaw.length === 0) {
    return { matrix: [], xLabels: [], yLabels: [], chartType: 'heatmap' }
  }

  // Calculate Torque if needed
  let yValues = yRaw
  if (analysis.yField === 'torque') {
    const cadence = toNumberArray(workout.streams.cadence)
    yValues = yRaw.map((w, i) => {
      const c = cadence[i] || 0
      return c > 10 ? Number(((w * 60) / (2 * Math.PI * c)).toFixed(1)) : 0
    })
  }

  // Find bounds
  const xMin = Math.min(...xRaw.filter((v) => v > 0)) || 0
  const xMax = Math.max(...xRaw)
  const yMin = Math.min(...yValues.filter((v) => v > 0)) || 0
  const yMax = Math.max(...yValues)

  const xStep = (xMax - xMin) / analysis.xBins
  const yStep = (yMax - yMin) / analysis.yBins

  const matrixMap = new Map<string, number>()
  const xLabels: string[] = []
  const yLabels: string[] = []

  // Initialize labels
  for (let i = 0; i < analysis.xBins; i++) {
    xLabels.push(Math.round(xMin + i * xStep).toString())
  }
  for (let j = 0; j < analysis.yBins; j++) {
    yLabels.push(Math.round(yMin + j * yStep).toString())
  }

  // Populate matrix
  for (let i = 0; i < xRaw.length; i++) {
    const x = xRaw[i]!
    const y = yValues[i]!
    if (x <= 0 || y <= 0) continue

    const xBin = Math.min(analysis.xBins - 1, Math.floor((x - xMin) / xStep))
    const yBin = Math.min(analysis.yBins - 1, Math.floor((y - yMin) / yStep))

    const key = `${xLabels[xBin]}::${yLabels[yBin]}`
    matrixMap.set(key, (matrixMap.get(key) || 0) + 1)
  }

  const matrix = Array.from(matrixMap.entries()).map(([key, value]) => {
    const [x, y] = key.split('::')
    return { x, y, value }
  })

  return {
    chartType: 'heatmap',
    xLabels,
    yLabels,
    matrix,
    meta: {
      xField: analysis.xField,
      yField: analysis.yField,
      xMin,
      xMax,
      yMin,
      yMax
    }
  }
})
