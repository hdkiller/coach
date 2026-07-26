import { assertMonitoringSecret } from '../../utils/monitoring-auth'
import {
  collectWorkerMonitoringSnapshot,
  workerMonitoringHttpStatus
} from '../../utils/worker-monitoring'

defineRouteMeta({
  openAPI: {
    tags: ['Monitoring'],
    summary: 'Worker and Redis monitoring',
    description:
      'Returns BullMQ queue health, Redis memory usage, and webhook processing signals. Returns HTTP 503 when status is critical.',
    responses: {
      200: { description: 'Healthy or degraded' },
      401: { description: 'Unauthorized' },
      503: { description: 'Critical worker or Redis health issue' }
    }
  }
})

export default defineEventHandler(async (event) => {
  assertMonitoringSecret(event)

  try {
    const snapshot = await collectWorkerMonitoringSnapshot()
    setResponseStatus(event, workerMonitoringHttpStatus(snapshot.status))

    return snapshot
  } catch (error: any) {
    console.error('Failed to collect worker monitoring snapshot:', error)
    setResponseStatus(event, 503)

    return {
      status: 'critical',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      alerts: [
        {
          level: 'critical',
          message:
            error instanceof Error ? error.message : 'Failed to collect worker monitoring snapshot'
        }
      ]
    }
  }
})
