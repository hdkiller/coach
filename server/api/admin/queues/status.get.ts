import { requireAdmin } from '../../../utils/auth-guard'
import { webhookQueue, pingQueue, streamsQueue } from '../../../utils/queue'

defineRouteMeta({
  openAPI: {
    tags: ['Admin'],
    summary: 'Get Queue Status',
    description: 'Returns the current status and metrics for all background job queues.',
    responses: {
      200: { description: 'OK' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const getQueueStats = async (queue: any, name: string) => {
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    )
    const workers = await queue.getWorkers()

    return {
      name,
      counts,
      workers: workers.length,
      isPaused: await queue.isPaused()
    }
  }

  try {
    const webhookStats = await getQueueStats(webhookQueue, 'Webhook Queue')
    const streamStats = await getQueueStats(streamsQueue, 'Streams Queue')
    const pingStats = await getQueueStats(pingQueue, 'Ping Queue')

    return {
      queues: [webhookStats, streamStats, pingStats],
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch queue stats: ${error.message}`
    })
  }
})
