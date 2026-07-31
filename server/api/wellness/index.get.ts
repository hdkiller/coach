import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'
import { wellnessRepository } from '../../utils/repositories/wellnessRepository'

/** Default lookback when startDate/endDate are omitted (preserves prior API behavior). */
const DEFAULT_RANGE_DAYS = 90
/**
 * Upper bound for custom ranges. Must cover Fitness "All Time" (3650 days)
 * and YTD without silent truncation.
 */
const MAX_RANGE_DAYS = 3660
const MS_PER_DAY = 24 * 60 * 60 * 1000

function parseOptionalDate(value: unknown, field: 'startDate' | 'endDate'): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw createError({
      statusCode: 400,
      message: `Invalid ${field}`
    })
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw createError({
      statusCode: 400,
      message: `Invalid ${field}`
    })
  }
  return date
}

function resolveWellnessDateRange(query: Record<string, unknown>): {
  startDate: Date
  endDate: Date
} {
  const startDate = parseOptionalDate(query.startDate, 'startDate')
  const endDate = parseOptionalDate(query.endDate, 'endDate')

  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw createError({
      statusCode: 400,
      message: 'Both startDate and endDate are required when specifying a custom range'
    })
  }

  if (!startDate && !endDate) {
    const defaultEnd = new Date()
    const defaultStart = new Date(defaultEnd)
    defaultStart.setUTCDate(defaultStart.getUTCDate() - DEFAULT_RANGE_DAYS)
    return { startDate: defaultStart, endDate: defaultEnd }
  }

  // Both are defined after the checks above
  const rangeStart = startDate as Date
  const rangeEnd = endDate as Date

  if (rangeStart > rangeEnd) {
    throw createError({
      statusCode: 400,
      message: 'startDate must be on or before endDate'
    })
  }

  const rangeMs = rangeEnd.getTime() - rangeStart.getTime()
  if (rangeMs > MAX_RANGE_DAYS * MS_PER_DAY) {
    throw createError({
      statusCode: 400,
      message: `Date range cannot exceed ${MAX_RANGE_DAYS} days`
    })
  }

  return { startDate: rangeStart, endDate: rangeEnd }
}

defineRouteMeta({
  openAPI: {
    tags: ['Wellness'],
    summary: 'List wellness data',
    description:
      'Returns wellness data for the authenticated user. Accepts optional startDate and endDate query parameters; defaults to the last 90 days when omitted.',
    security: [{ bearerAuth: [] }],
    inputSchema: [
      {
        name: 'startDate',
        in: 'query',
        required: false,
        schema: { type: 'string', format: 'date-time' },
        description: 'Range start (inclusive). Must be provided with endDate.'
      },
      {
        name: 'endDate',
        in: 'query',
        required: false,
        schema: { type: 'string', format: 'date-time' },
        description: 'Range end (inclusive). Must be provided with startDate.'
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  date: { type: 'string', format: 'date-time' },
                  hrv: { type: 'number', nullable: true },
                  restingHr: { type: 'integer', nullable: true },
                  sleepScore: { type: 'integer', nullable: true },
                  readiness: { type: 'integer', nullable: true },
                  recoveryScore: { type: 'integer', nullable: true },
                  weight: { type: 'number', nullable: true },
                  systolic: { type: 'integer', nullable: true },
                  diastolic: { type: 'integer', nullable: true }
                }
              }
            }
          }
        }
      },
      400: { description: 'Invalid date range' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['health:read'])
  const query = getQuery(event) as Record<string, unknown>
  const { startDate, endDate } = resolveWellnessDateRange(query)

  try {
    const userId = user.id

    const wellness = await wellnessRepository.getForUser(userId, {
      startDate,
      endDate,
      orderBy: { date: 'desc' }
    })

    // Fetch LLM usage for these wellness records
    const wellnessIds = wellness.map((w) => w.id)
    const llmUsages = await prisma.llmUsage.findMany({
      where: {
        entityId: { in: wellnessIds },
        entityType: 'Wellness'
      },
      select: {
        id: true,
        entityId: true,
        feedback: true,
        feedbackText: true
      }
    })

    // Create a map for faster lookup
    const usageMap = new Map(llmUsages.map((u) => [u.entityId, u]))

    // Attach usage data to wellness records
    return wellness.map((w) => {
      const usage = usageMap.get(w.id)
      return {
        ...w,
        llmUsageId: usage?.id,
        feedback: usage?.feedback,
        feedbackText: usage?.feedbackText
      }
    })
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch wellness data'
    })
  }
})
