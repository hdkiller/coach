import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { assertSingleWorkoutAccess } from '../../../utils/analyticsScope'
import { prisma } from '../../../utils/db'
import { calculateSegmentSummary } from '../../../utils/analytics/segment-summary'
import {
  allowedWorkoutExplorerSummaryMetrics,
  normalizeWorkoutMetricValue,
  workoutExplorerMetricLabels,
  workoutExplorerMetricUnits
} from '../../../utils/workoutExplorer'

const schema = z.object({
  analysis: z.object({
    type: z.literal('single_workout'),
    mode: z.literal('summary'),
    workoutId: z.string().min(1)
  }),
  summaryType: z.enum(['metrics', 'zones']).optional(),
  metrics: z.array(z.object({ field: z.string() })).default([]),
  zoneType: z.enum(['power', 'hr']).optional(),
  visualType: z.enum(['bar', 'line']).optional(),
  range: z
    .object({
      start: z.number(),
      end: z.number(),
      alignment: z.enum(['elapsed_time', 'distance']).default('elapsed_time')
    })
    .nullable()
    .optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid workout explorer summary configuration',
      data: result.error.issues
    })
  }

  const { analysis, metrics, visualType, summaryType, zoneType, range } = result.data
  const workoutId = await assertSingleWorkoutAccess(user.id, analysis.workoutId)

  if (summaryType === 'zones') {
    if (!zoneType) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Zone summary requires a zone type'
      })
    }

    let zoneDistribution: any
    if (range) {
      const segment = await calculateSegmentSummary(user.id, workoutId, range)
      zoneDistribution =
        zoneType === 'hr' ? segment.zoneDistribution?.hr : segment.zoneDistribution?.power
    } else {
      const { calculateZoneDistribution } = await import('../../../utils/training-metrics')
      const distribution = await calculateZoneDistribution([workoutId], user.id, prisma)
      zoneDistribution = zoneType === 'hr' ? distribution.hr : distribution.power
    }

    if (!zoneDistribution || zoneDistribution.zones.length === 0) {
      return {
        labels: [],
        datasets: [],
        unsupportedReason: `No ${zoneType === 'hr' ? 'heart-rate' : 'power'} zone data was available for this workout.`
      }
    }

    return {
      labels: zoneDistribution.zones.map((zone) => zone.name),
      datasets: [
        {
          label: zoneType === 'hr' ? 'Heart Rate Zone Time' : 'Power Zone Time',
          type: visualType || 'bar',
          data: zoneDistribution.zones.map((zone) => Number(zone.percentage.toFixed(1)))
        }
      ],
      annotations: []
    }
  }

  const metricFields = metrics.map((metric) => metric.field)
  if (metricFields.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Metric summary requires at least one metric'
    })
  }
  for (const field of metricFields) {
    if (!allowedWorkoutExplorerSummaryMetrics.has(field)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Unsupported workout explorer metric: ${field}`
      })
    }
  }

  const workout = range
    ? await calculateSegmentSummary(user.id, workoutId, range)
    : await prisma.workout.findFirst({
        where: { id: workoutId },
        select: {
          id: true,
          trainingLoad: true,
          tss: true,
          kilojoules: true,
          calories: true,
          elevationGain: true,
          averageWatts: true,
          maxWatts: true,
          normalizedPower: true,
          averageHr: true,
          maxHr: true,
          averageCadence: true,
          averageSpeed: true,
          intensity: true,
          efficiencyFactor: true,
          decoupling: true,
          powerHrRatio: true,
          variabilityIndex: true,
          durationSec: true,
          elapsedTimeSec: true,
          distanceMeters: true,
          trimp: true,
          hrLoad: true,
          workAboveFtp: true
        }
      })

  if (!workout) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Workout not found'
    })
  }

  return {
    labels: ['Workout'],
    datasets: metricFields.map((field) => ({
      label: workoutExplorerMetricLabels[field] || field,
      type: visualType || 'bar',
      data: [normalizeWorkoutMetricValue(field, (workout as any)[field])]
    })),
    annotations: []
  }
})
