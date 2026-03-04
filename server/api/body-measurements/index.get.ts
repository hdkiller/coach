import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { bodyMeasurementRepository } from '../../utils/repositories/bodyMeasurementRepository'

const querySchema = z.object({
  metricKey: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:read'])
  const query = querySchema.parse(getQuery(event))

  const startDate = query.from ? new Date(query.from) : undefined
  const endDate = query.to ? new Date(query.to) : undefined

  const items = await bodyMeasurementRepository.listForUser(user.id, {
    metricKey: query.metricKey,
    startDate,
    endDate,
    limit: query.limit
  })

  const latestByMetric = new Map<string, (typeof items)[number]>()
  for (const item of items) {
    if (!latestByMetric.has(item.metricKey)) {
      latestByMetric.set(item.metricKey, item)
    }
  }

  return {
    items,
    latestByMetric: Object.fromEntries(latestByMetric.entries())
  }
})
