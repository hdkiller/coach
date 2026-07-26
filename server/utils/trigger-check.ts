import { runs } from '@trigger.dev/sdk/v3'

const RUNNING_STATUSES = new Set([
  'EXECUTING',
  'QUEUED',
  'WAITING_FOR_DEPLOY',
  'REATTEMPTING',
  'FROZEN'
])

/** Trigger runs older than this are treated as stale and ignored for sync guards. */
export const STALE_TRIGGER_RUN_MS = 2 * 60 * 60 * 1000

function getRunTimestamp(run: {
  startedAt?: string | Date | null
  createdAt?: string | Date | null
}) {
  return run.startedAt || run.createdAt || null
}

export function isRunFresh(
  run: { startedAt?: string | Date | null; createdAt?: string | Date | null },
  nowMs = Date.now(),
  maxAgeMs = STALE_TRIGGER_RUN_MS
): boolean {
  const timestamp = getRunTimestamp(run)
  if (!timestamp) return true
  return nowMs - new Date(timestamp).getTime() <= maxAgeMs
}

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

    const nowMs = Date.now()

    // Trigger API may ignore status filters; verify client-side and skip stale runs.
    return activeRuns.data.some((run) => {
      if (!RUNNING_STATUSES.has(run.status)) return false
      if (!isRunFresh(run, nowMs)) {
        console.warn(
          `[Sync] Ignoring stale Trigger run ${run.id} for ${taskIdentifier} (status=${run.status})`
        )
        return false
      }
      return true
    })
  } catch (error) {
    console.warn(`Failed to check running status for task ${taskIdentifier}:`, error)
    return false // Fail open to allow retry if check fails
  }
}

export async function isRunIdRunning(runId: string): Promise<boolean> {
  try {
    const run = await runs.retrieve(runId)
    const runningStatuses = ['EXECUTING', 'QUEUED', 'WAITING_FOR_DEPLOY', 'REATTEMPTING', 'FROZEN']
    if (!runningStatuses.includes(run.status)) return false
    if (!isRunFresh(run)) {
      console.warn(`[Sync] Ignoring stale Trigger run ${runId} (status=${run.status})`)
      return false
    }
    return true
  } catch (error) {
    console.warn(`Failed to check running status for run ${runId}:`, error)
    return false
  }
}

export async function safeTriggerTask(
  taskIdentifier: string,
  payload: any,
  options?: any
): Promise<{ id: string }> {
  if (process.env.E2E_MODE === 'true' && !process.env.TRIGGER_SECRET_KEY) {
    console.log(`[Trigger] Mocking task trigger in E2E_MODE for task: ${taskIdentifier}`)
    return { id: `e2e-mock-run-${Date.now()}` }
  }

  try {
    const { tasks } = await import('@trigger.dev/sdk/v3')
    return await tasks.trigger(taskIdentifier, payload, options)
  } catch (error) {
    if (process.env.E2E_MODE === 'true' || !process.env.TRIGGER_SECRET_KEY) {
      console.warn(
        `[Trigger] Task trigger failed (E2E_MODE or missing TRIGGER_SECRET_KEY), returning fallback handle for ${taskIdentifier}:`,
        error
      )
      return { id: `e2e-mock-run-${Date.now()}` }
    }
    throw error
  }
}

