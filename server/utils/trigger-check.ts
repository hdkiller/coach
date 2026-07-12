import { runs } from '@trigger.dev/sdk/v3'

const RUNNING_STATUSES = new Set([
  'EXECUTING',
  'QUEUED',
  'WAITING_FOR_DEPLOY',
  'REATTEMPTING',
  'FROZEN'
])

export async function isTaskRunning(taskIdentifier: string, userId: string): Promise<boolean> {
  try {
    // @ts-expect-error - SDK v3 types mismatch for filter params
    const activeRuns = await runs.list({
      filter: {
        taskIdentifier: [taskIdentifier],
        tags: [`user:${userId}`],
        status: ['EXECUTING', 'QUEUED', 'WAITING_FOR_DEPLOY', 'REATTEMPTING']
      },
      limit: 10
    })

    // Trigger API may ignore status filters; verify client-side.
    return activeRuns.data.some((run) => RUNNING_STATUSES.has(run.status))
  } catch (error) {
    console.warn(`Failed to check running status for task ${taskIdentifier}:`, error)
    return false // Fail open to allow retry if check fails
  }
}

export async function isRunIdRunning(runId: string): Promise<boolean> {
  try {
    const run = await runs.retrieve(runId)
    const runningStatuses = ['EXECUTING', 'QUEUED', 'WAITING_FOR_DEPLOY', 'REATTEMPTING', 'FROZEN']
    return runningStatuses.includes(run.status)
  } catch (error) {
    console.warn(`Failed to check running status for run ${runId}:`, error)
    return false
  }
}
