import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { analyticsRepository } from '../../utils/repositories/analyticsRepository'
import {
  assertAnalyticsScopeAccess,
  assertWorkoutComparisonAccess
} from '../../utils/analyticsScope'

const querySchema = z
  .object({
    source: z.enum(['workouts', 'wellness', 'nutrition']),
    visualType: z
      .enum(['line', 'bar', 'combo', 'stackedBar', 'scatter', 'horizontalBar', 'heatmap'])
      .optional(),
    scope: z
      .object({
        target: z.enum(['self', 'athlete', 'athletes', 'athlete_group', 'team']),
        targetId: z.string().optional(),
        targetIds: z.array(z.string()).optional()
      })
      .default({ target: 'self' }),
    timeRange: z.object({
      startDate: z.union([z.string(), z.date()]).pipe(z.coerce.date()),
      endDate: z.union([z.string(), z.date()]).pipe(z.coerce.date())
    }),
    grouping: z.enum(['daily', 'weekly', 'monthly']),
    comparison: z
      .object({
        type: z.literal('workouts'),
        mode: z.enum(['summary', 'stream', 'interval']),
        workoutIds: z.array(z.string().min(1)).min(2),
        alignment: z.enum(['elapsed_time', 'distance', 'percent_complete', 'lap_index']).optional(),
        field: z.string().optional()
      })
      .optional(),
    xAxis: z
      .object({
        type: z.literal('entity_label'),
        sort: z.enum(['selected_order', 'chronological', 'metric_desc']).optional(),
        sortMetricField: z.string().optional()
      })
      .optional(),
    metrics: z
      .array(
        z.object({
          field: z.string(),
          aggregation: z.enum(['sum', 'avg', 'max', 'min', 'count'])
        })
      )
      .default([]),
    filters: z
      .array(
        z.object({
          field: z.string(),
          operator: z.enum(['equals', 'in', 'gt', 'lt']),
          value: z.any()
        })
      )
      .optional()
  })
  .passthrough()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const result = querySchema.safeParse(body)

  if (!result.success) {
    console.error(
      '[AnalyticsQuery] Validation Error:',
      JSON.stringify(result.error.issues, null, 2)
    )
    console.error('[AnalyticsQuery] Payload:', JSON.stringify(body, null, 2))
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query configuration',
      data: result.error.issues
    })
  }

  const options = result.data

  if (
    (!options.metrics || options.metrics.length === 0) &&
    options.comparison?.mode !== 'stream' &&
    options.comparison?.mode !== 'interval'
  ) {
    return { labels: [], datasets: [] }
  }

  await assertAnalyticsScopeAccess(user.id, options.scope)

  if (options.comparison?.type === 'workouts') {
    options.comparison.workoutIds = await assertWorkoutComparisonAccess(
      user.id,
      options.comparison.workoutIds
    )
  }

  return await analyticsRepository.query(user.id, options as any)
})
