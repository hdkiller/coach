import { getServerSession } from '../../utils/session'
import { runs } from '@trigger.dev/sdk/v3'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  try {
    // List active runs for this user
    // @ts-expect-error - SDK v3 types mismatch for filter params but works in runtime
    const activeRuns = await runs.list({
      filter: {
        tags: [`user:${session.user.id}`],
        status: [
          'EXECUTING',
          'QUEUED',
          'WAITING_FOR_DEPLOY',
          'REATTEMPTING',
          'FROZEN',
          'COMPLETED',
          'FAILED',
          'CANCELED',
          'TIMED_OUT',
          'CRASHED',
          'SYSTEM_FAILURE'
        ]
      },
      limit: 20,
      sort: { createdAt: 'desc' }
    })

    const now = new Date()
    const RECENT_THRESHOLD_MS = 60 * 1000 // 1 minute

    // Filter to ensure we only return active runs OR recently finished runs
    const filteredRuns = activeRuns.data.filter((run) => {
      const isActive = [
        'EXECUTING',
        'QUEUED',
        'WAITING_FOR_DEPLOY',
        'REATTEMPTING',
        'FROZEN'
      ].includes(run.status)

      if (isActive) return true

      // For final states, only include if finished recently
      if (run.finishedAt) {
        const finishedTime = new Date(run.finishedAt).getTime()
        return now.getTime() - finishedTime < RECENT_THRESHOLD_MS
      }

      // If finishedAt is missing but status is final, typically older/weird state, exclude safely or include?
      // Include to be safe, but unlikely to happen for fresh runs.
      return false
    })

    return filteredRuns.map((run) => ({
      id: run.id,
      taskIdentifier: run.taskIdentifier,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      isTest: run.isTest
    }))
  } catch (error: any) {
    console.error(`Failed to list active runs for user ${session.user.id}:`, error)
    throw createError({ statusCode: 500, message: 'Failed to retrieve active runs' })
  }
})
