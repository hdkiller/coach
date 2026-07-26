import { assertMonitoringSecret } from '../../utils/monitoring-auth'
import { listRecentTaskRuns } from '../../utils/task-dispatcher'

export default defineEventHandler(async (event) => {
  assertMonitoringSecret(event)

  try {
    // Fetch last 50 runs
    const limit = 50
    const runList = await listRecentTaskRuns(limit)
    const total = runList.length

    const stats = {
      total,
      completed: 0,
      failed: 0,
      canceled: 0,
      executing: 0,
      queued: 0,
      other: 0
    }

    const recentFailures = []

    for (const run of runList) {
      switch (run.status as any) {
        case 'COMPLETED':
          stats.completed++
          break
        case 'FAILED':
        case 'CRASHED':
        case 'TIMED_OUT':
        case 'SYSTEM_FAILURE':
          stats.failed++
          recentFailures.push({
            id: run.id,
            taskIdentifier: run.taskIdentifier,
            status: run.status,
            startedAt: run.startedAt,
            finishedAt: run.finishedAt,
            isTest: run.isTest
          })
          break
        case 'CANCELED':
          stats.canceled++
          break
        case 'EXECUTING':
        case 'REATTEMPTING':
        case 'FROZEN':
          stats.executing++
          break
        case 'QUEUED':
        case 'WAITING_FOR_DEPLOY':
          stats.queued++
          break
        default:
          stats.other++
      }
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      period: `Last ${limit} runs`,
      stats,
      recentFailures: recentFailures.slice(0, 5) // Return top 5 recent failures
    }
  } catch (error: any) {
    console.error('Failed to fetch trigger runs:', error)
    throw createError({
      statusCode: 503,
      statusMessage: 'Failed to fetch task stats',
      data: {
        message: error.message
      }
    })
  }
})
