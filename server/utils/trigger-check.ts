import { runs } from '@trigger.dev/sdk/v3'

export async function isTaskRunning(taskIdentifier: string, userId: string): Promise<boolean> {
  try {
    const activeRuns = await runs.list({
      filter: {
        taskIdentifier: [taskIdentifier],
        tags: [`user:${userId}`],
        status: ['EXECUTING', 'QUEUED', 'WAITING_FOR_DEPLOY', 'REATTEMPTING']
      },
      limit: 1
    })

    return activeRuns.data.length > 0
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
