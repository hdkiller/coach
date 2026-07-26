import { mainTaskQueue } from './queue'
import { safeTriggerTask, isRunIdRunning } from './trigger-check'

export type TaskQueueDriver = 'trigger' | 'redis' | 'inline'

export interface TaskDispatchOptions {
  id?: string
  delay?: number | string
  concurrencyKey?: string
  tags?: string[]
  retry?: {
    maxAttempts?: number
  }
}

/**
  Determines the active task queue driver.
  Defaults to 'trigger' if TRIGGER_SECRET_KEY is defined in environment,
  otherwise defaults to 'redis'. Can be overridden explicitly via TASK_QUEUE_DRIVER env var.
 */
export function getTaskDriver(): TaskQueueDriver {
  const envDriver = process.env.TASK_QUEUE_DRIVER?.toLowerCase()
  if (envDriver === 'trigger' || envDriver === 'redis' || envDriver === 'inline') {
    return envDriver
  }

  // Default behavior: trigger if key is set, otherwise redis
  if (process.env.TRIGGER_SECRET_KEY && process.env.E2E_MODE !== 'true') {
    return 'trigger'
  }

  return 'redis'
}

/**
 * Centralized task dispatcher supporting dual execution backends (Trigger.dev & Redis/BullMQ).
 */
export async function dispatchTask(
  taskIdentifier: string,
  payload: any,
  options?: TaskDispatchOptions
): Promise<{ id: string }> {
  const driver = getTaskDriver()

  if (driver === 'trigger') {
    return await safeTriggerTask(taskIdentifier, payload, options)
  }

  if (driver === 'redis') {
    const jobOptions: Record<string, any> = {
      jobId: options?.id
    }

    if (options?.delay) {
      jobOptions.delay =
        typeof options.delay === 'number' ? options.delay : parseInt(String(options.delay))
    }

    if (options?.retry?.maxAttempts) {
      jobOptions.attempts = options.retry.maxAttempts
    }

    const job = await mainTaskQueue.add(
      taskIdentifier,
      {
        payload,
        options: {
          concurrencyKey: options?.concurrencyKey,
          tags: options?.tags
        }
      },
      jobOptions
    )

    return { id: job.id || `redis-job-${Date.now()}` }
  }

  if (driver === 'inline') {
    console.log(`[TaskDispatcher] [Inline] Executing task inline: ${taskIdentifier}`)
    return { id: `inline-run-${Date.now()}` }
  }

  throw new Error(`Unsupported task queue driver: ${driver}`)
}

/**
 * Checks the running status of a run/job ID across drivers.
 */
export async function getTaskStatus(
  taskIdentifier: string,
  runOrJobId: string
): Promise<{ isRunning: boolean; status?: string }> {
  const driver = getTaskDriver()

  if (driver === 'trigger') {
    const running = await isRunIdRunning(runOrJobId)
    return { isRunning: running }
  }

  if (driver === 'redis') {
    try {
      const job = await mainTaskQueue.getJob(runOrJobId)
      if (!job) return { isRunning: false, status: 'NOT_FOUND' }
      const state = await job.getState()
      const isRunning = state === 'active' || state === 'waiting' || state === 'delayed'
      return { isRunning, status: state.toUpperCase() }
    } catch {
      return { isRunning: false, status: 'UNKNOWN' }
    }
  }

  return { isRunning: false, status: 'INLINE_COMPLETED' }
}
