import { requireAuth } from '../../../utils/auth-guard'
import { prisma } from '../../../utils/db'
import { tasks } from '@trigger.dev/sdk/v3'
import { publishTaskRunStartedEvent } from '../../../utils/task-run-events'
import { assertQuotaAllowed } from '../../../utils/quotas/http'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['health:write'])
  const userId = user.id
  await assertQuotaAllowed(userId, 'wellness_analysis')

  const param = getRouterParam(event, 'wellnessId') || getRouterParam(event, 'id')

  if (!param) {
    throw createError({ statusCode: 400, message: 'Parameter is required' })
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param)
  let wellness: any = null

  if (isUuid) {
    // Fetch the wellness record by ID
    wellness = await prisma.wellness.findUnique({
      where: { id: param }
    })
  } else {
    // Fetch the wellness record by Date
    const date = new Date(param)
    if (isNaN(date.getTime())) {
      throw createError({ statusCode: 400, message: 'Invalid date format' })
    }
    wellness = await prisma.wellness.findUnique({
      where: {
        userId_date: {
          userId,
          date
        }
      }
    })
  }

  if (!wellness) {
    throw createError({ statusCode: 404, message: 'Wellness record not found' })
  }

  if (wellness.userId !== userId) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  const wellnessId = wellness.id

  // Update status to PROCESSING
  await prisma.wellness.update({
    where: { id: wellnessId },
    data: { aiAnalysisStatus: 'PROCESSING' }
  })

  try {
    // Trigger the background task
    const handle = await tasks.trigger(
      'analyze-wellness',
      {
        wellnessId,
        userId
      },
      {
        concurrencyKey: userId,
        tags: [`user:${userId}`],
        idempotencyKey: wellnessId,
        idempotencyKeyTTL: '5m'
      }
    )

    await publishTaskRunStartedEvent(userId, 'analyze-wellness', handle)

    return {
      status: 'PROCESSING',
      jobId: handle.id
    }
  } catch (error: any) {
    console.error('Failed to trigger wellness analysis:', error)

    await prisma.wellness.update({
      where: { id: wellnessId },
      data: { aiAnalysisStatus: 'FAILED' }
    })

    throw createError({
      statusCode: 500,
      message: `Failed to start analysis: ${error.message}`
    })
  }
})
