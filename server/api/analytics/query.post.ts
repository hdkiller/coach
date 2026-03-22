import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { analyticsRepository } from '../../utils/repositories/analyticsRepository'
import { assertAnalyticsScopeAccess } from '../../utils/analyticsScope'

const querySchema = z
  .object({
    source: z.enum(['workouts', 'wellness', 'nutrition']),
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

  if (!options.metrics || options.metrics.length === 0) {
    return { labels: [], datasets: [] }
  }

  await assertAnalyticsScopeAccess(user.id, options.scope)

  return await analyticsRepository.query(user.id, options as any)
})
