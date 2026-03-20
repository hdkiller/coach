import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Profile'],
    summary: 'Wipe Wellness Data',
    description: 'Removes all imported HRV, RHR, and Sleep logs.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                counts: {
                  type: 'object',
                  properties: {
                    wellness: { type: 'integer' },
                    dailyMetrics: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['health:write'])
  const userId = user.id

  // 1. Delete Wellness records
  const wellnessDelete = await prisma.wellness.deleteMany({
    where: { userId }
  })

  // 2. Delete DailyMetric records (Intervals metadata)
  const dailyMetricsDelete = await prisma.dailyMetric.deleteMany({
    where: { userId }
  })

  return {
    success: true,
    counts: {
      wellness: wellnessDelete.count,
      dailyMetrics: dailyMetricsDelete.count
    }
  }
})
