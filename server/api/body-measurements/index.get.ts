import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { bodyMeasurementRepository } from '../../utils/repositories/bodyMeasurementRepository'

const querySchema = z.object({
  metricKey: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).default(250),
  cursorRecordedAt: z.string().optional(),
  cursorId: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:read'])
  const query = querySchema.parse(getQuery(event))

  const startDate = query.from ? new Date(query.from) : undefined
  const endDate = query.to ? new Date(query.to) : undefined
  const cursorRecordedAt = query.cursorRecordedAt ? new Date(query.cursorRecordedAt) : undefined

  if (cursorRecordedAt && Number.isNaN(cursorRecordedAt.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid cursorRecordedAt'
    })
  }

  function normalizeSourceKey(source: string) {
    if (source === 'profile_manual' || source === 'profile_locked') return 'profile'
    if (source === 'manual_measurement' || source === 'manual' || source === 'manual_edit')
      return 'manual'
    if (source.startsWith('oauth:')) return 'oauth'
    return source
  }

  const pagedItems = await bodyMeasurementRepository.listForUser(user.id, {
    metricKey: query.metricKey,
    startDate,
    endDate,
    limit: query.limit + 1,
    cursorRecordedAt,
    cursorId: query.cursorId
  })

  const latestCandidates = await bodyMeasurementRepository.listForUser(user.id, {
    metricKey: query.metricKey,
    startDate,
    endDate,
    orderBy: [{ metricKey: 'asc' }, { recordedAt: 'desc' }, { id: 'desc' }]
  })

  const hasMore = pagedItems.length > query.limit
  const items = hasMore ? pagedItems.slice(0, query.limit) : pagedItems
  const latestByMetric = new Map<string, (typeof items)[number]>()
  const latestByMetricSource = new Map<string, Map<string, (typeof items)[number]>>()

  for (const item of latestCandidates) {
    if (!latestByMetric.has(item.metricKey)) {
      latestByMetric.set(item.metricKey, item)
    }

    const sourceKey = normalizeSourceKey(item.source)
    const sourceMap = latestByMetricSource.get(item.metricKey) || new Map()
    if (!sourceMap.has(sourceKey)) {
      sourceMap.set(sourceKey, item)
      latestByMetricSource.set(item.metricKey, sourceMap)
    }
  }

  const lastItem = items.at(-1)

  return {
    items,
    latestByMetric: Object.fromEntries(latestByMetric.entries()),
    latestByMetricSource: Object.fromEntries(
      [...latestByMetricSource.entries()].map(([metricKey, sourceMap]) => [
        metricKey,
        Object.fromEntries(sourceMap.entries())
      ])
    ),
    pageInfo: {
      hasMore,
      nextCursor:
        hasMore && lastItem
          ? {
              recordedAt: lastItem.recordedAt.toISOString(),
              id: lastItem.id
            }
          : null
    }
  }
})
