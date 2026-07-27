import { createHash, randomUUID } from 'node:crypto'
import { runs, tasks } from '@trigger.dev/sdk/v3'
import type { Job, JobsOptions } from 'bullmq'
import { mainTaskQueue } from './queue'
import { executeRegisteredTask, getCurrentTaskExecution, hasTaskHandler } from './task-registry'
import { isRunFresh, safeTriggerTask } from './trigger-check'
import taskManifest from './task-manifest.json' with { type: 'json' }

export type TaskQueueDriver = 'trigger' | 'redis' | 'inline'

export interface TaskDispatchOptions {
  id?: string
  idempotencyKey?: string
  idempotencyKeyTTL?: string
  delay?: number | string
  concurrencyKey?: string
  tags?: string[]
  retry?: {
    maxAttempts?: number
  }
}

export interface TaskRunRecord {
  id: string
  taskIdentifier: string
  status: string
  startedAt: string
  finishedAt?: string
  output?: unknown
  error?: { message: string } | unknown
  isTest?: boolean
  tags: string[]
}

const ACTIVE_RUN_STATUSES = new Set([
  'EXECUTING',
  'QUEUED',
  'WAITING_FOR_DEPLOY',
  'REATTEMPTING',
  'FROZEN',
  'PENDING_VERSION',
  'DELAYED'
])
const REDIS_RUN_PREFIX = 'redis:'
const INLINE_RUN_PREFIX = 'inline:'
const DEFAULT_REDIS_ATTEMPTS = 3
const DEFAULT_REDIS_BACKOFF_MS = 1000

const inlineRuns = new Map<string, TaskRunRecord>()
type TaskDefinition = {
  id: string
  maxDuration?: number
  retry?: {
    maxAttempts?: number
    factor?: number
    minTimeoutInMs?: number
    maxTimeoutInMs?: number
    randomize?: boolean
  }
  queue?: { name?: string; concurrencyLimit?: number }
  schedule?: { cron: string; timezone?: string }
}
const taskDefinitionById = new Map(
  (taskManifest as TaskDefinition[]).map((definition) => [definition.id, definition] as const)
)

function getTaskDefinition(taskIdentifier: string): TaskDefinition | undefined {
  return taskDefinitionById.get(taskIdentifier)
}

/** Resolves the configured backend used for newly dispatched tasks. */
export function getTaskDriver(): TaskQueueDriver {
  const envDriver = process.env.TASK_QUEUE_DRIVER?.toLowerCase()
  if (envDriver === 'trigger' || envDriver === 'redis' || envDriver === 'inline') {
    return envDriver
  }

  if (process.env.TRIGGER_SECRET_KEY && process.env.E2E_MODE !== 'true') {
    return 'trigger'
  }

  return 'redis'
}

export function formatTaskRunId(driver: TaskQueueDriver, rawId: string): string {
  if (driver === 'redis') return `${REDIS_RUN_PREFIX}${rawId}`
  if (driver === 'inline') return `${INLINE_RUN_PREFIX}${rawId}`
  return rawId
}

export function parseTaskRunId(runId: string): { driver: TaskQueueDriver; rawId: string } {
  if (runId.startsWith(REDIS_RUN_PREFIX)) {
    return { driver: 'redis', rawId: runId.slice(REDIS_RUN_PREFIX.length) }
  }
  if (runId.startsWith(INLINE_RUN_PREFIX)) {
    return { driver: 'inline', rawId: runId.slice(INLINE_RUN_PREFIX.length) }
  }
  // Trigger.dev run IDs are already persisted throughout the application. Keep
  // them readable after switching the default dispatcher to Redis.
  if (runId.startsWith('run_')) return { driver: 'trigger', rawId: runId }
  return { driver: getTaskDriver(), rawId: runId }
}

function parseDelay(delay: number | string): number {
  if (typeof delay === 'number') return Math.max(0, delay)

  const value = delay.trim().toLowerCase()
  const match = value.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?$/)
  if (!match) throw new Error(`Unsupported task delay: ${delay}`)

  const amount = Number(match[1])
  const multiplier =
    match[2] === 'd'
      ? 86_400_000
      : match[2] === 'h'
        ? 3_600_000
        : match[2] === 'm'
          ? 60_000
          : match[2] === 's'
            ? 1000
            : 1
  return Math.round(amount * multiplier)
}

function buildRedisJobId(taskIdentifier: string, requestedId?: string): string | undefined {
  if (!requestedId) return undefined
  const digest = createHash('sha256')
    .update(`${taskIdentifier}\0${requestedId}`)
    .digest('hex')
    .slice(0, 32)
  return `${taskIdentifier.replace(/[^a-zA-Z0-9_-]/g, '-')}-${digest}`
}

function toTriggerOptions(options?: TaskDispatchOptions) {
  if (!options) return undefined
  const triggerOptions: Record<string, unknown> = {
    ...options,
    ...(options.id ? { idempotencyKey: options.id } : {})
  }
  delete triggerOptions.id
  return triggerOptions
}

function normalizeRedisStatus(state: string): string {
  switch (state) {
    case 'active':
      return 'EXECUTING'
    case 'waiting':
    case 'waiting-children':
      return 'QUEUED'
    case 'delayed':
      return 'DELAYED'
    case 'paused':
      return 'FROZEN'
    case 'completed':
      return 'COMPLETED'
    case 'failed':
      return 'FAILED'
    default:
      return state.toUpperCase()
  }
}

function redisJobTags(job: Job): string[] {
  const tags = job.data?.options?.tags
  return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : []
}

async function redisJobToRun(job: Job): Promise<TaskRunRecord> {
  const state = await job.getState()
  const startedAtMs = job.processedOn || job.timestamp
  return {
    id: formatTaskRunId('redis', String(job.id)),
    taskIdentifier: job.name,
    status: normalizeRedisStatus(state),
    startedAt: new Date(startedAtMs).toISOString(),
    ...(job.finishedOn ? { finishedAt: new Date(job.finishedOn).toISOString() } : {}),
    ...(job.returnvalue !== undefined ? { output: job.returnvalue } : {}),
    ...(job.failedReason ? { error: { message: job.failedReason } } : {}),
    tags: redisJobTags(job)
  }
}

/** Dispatches a task through Trigger.dev, Redis/BullMQ, or the in-process registry. */
export async function dispatchTask(
  taskIdentifier: string,
  payload: any,
  options?: TaskDispatchOptions
): Promise<{ id: string }> {
  const driver = getTaskDriver()

  if (driver === 'trigger') {
    const triggerOptions = toTriggerOptions(options)
    return await safeTriggerTask(taskIdentifier, payload, triggerOptions)
  }

  if (driver === 'redis') {
    const definition = getTaskDefinition(taskIdentifier)
    if (!definition) {
      throw new Error(`Task is not available with the Redis driver: ${taskIdentifier}`)
    }
    const requestedId = options?.id || options?.idempotencyKey
    const redisId = buildRedisJobId(taskIdentifier, requestedId)
    const jobOptions: JobsOptions = {
      ...(options?.idempotencyKeyTTL && redisId
        ? {
            deduplication: {
              id: redisId,
              ttl: parseDelay(options.idempotencyKeyTTL)
            }
          }
        : { jobId: redisId }),
      attempts:
        options?.retry?.maxAttempts || definition?.retry?.maxAttempts || DEFAULT_REDIS_ATTEMPTS,
      backoff: { type: 'exponential', delay: DEFAULT_REDIS_BACKOFF_MS }
    }

    if (options?.delay !== undefined) {
      jobOptions.delay = parseDelay(options.delay)
    }

    const job = await mainTaskQueue.add(
      taskIdentifier,
      {
        payload,
        options: {
          concurrencyKey: options?.concurrencyKey,
          tags: options?.tags,
          queueName: definition?.queue?.name,
          concurrencyLimit: definition?.queue?.concurrencyLimit,
          maxDuration: definition?.maxDuration
        }
      },
      jobOptions
    )

    if (!job.id) throw new Error(`Redis did not return a job ID for task: ${taskIdentifier}`)
    return { id: formatTaskRunId('redis', String(job.id)) }
  }

  const rawId = randomUUID()
  const id = formatTaskRunId('inline', rawId)
  const startedAt = new Date().toISOString()

  if (!hasTaskHandler(taskIdentifier)) {
    console.warn(`[TaskDispatcher] No inline task handler registered for: ${taskIdentifier}`)
    inlineRuns.set(id, {
      id,
      taskIdentifier,
      status: 'COMPLETED',
      startedAt,
      finishedAt: startedAt,
      tags: options?.tags || []
    })
    return { id }
  }

  inlineRuns.set(id, {
    id,
    taskIdentifier,
    status: 'EXECUTING',
    startedAt,
    tags: options?.tags || []
  })

  try {
    const output = await executeRegisteredTask(taskIdentifier, payload)
    inlineRuns.set(id, {
      id,
      taskIdentifier,
      status: 'COMPLETED',
      startedAt,
      finishedAt: new Date().toISOString(),
      output,
      tags: options?.tags || []
    })
    return { id }
  } catch (error) {
    inlineRuns.set(id, {
      id,
      taskIdentifier,
      status: 'FAILED',
      startedAt,
      finishedAt: new Date().toISOString(),
      error: { message: error instanceof Error ? error.message : String(error) },
      tags: options?.tags || []
    })
    throw error
  }
}

export async function dispatchTaskAndWait<T = unknown>(
  taskIdentifier: string,
  payload: any,
  options?: TaskDispatchOptions
): Promise<{ ok: true; output: T } | { ok: false; error: unknown }> {
  const driver = getTaskDriver()

  if (driver === 'trigger') {
    const result = await tasks.triggerAndWait(
      taskIdentifier,
      payload,
      toTriggerOptions(options) as any
    )
    return result.ok ? { ok: true, output: result.output as T } : { ok: false, error: result.error }
  }

  const definition = getTaskDefinition(taskIdentifier)
  if (
    !definition ||
    ((driver === 'inline' || getCurrentTaskExecution()) && !hasTaskHandler(taskIdentifier))
  ) {
    return {
      ok: false,
      error: new Error(`Task is not available with the ${driver} driver: ${taskIdentifier}`)
    }
  }

  // A Redis worker waiting on another job in the same queue can deadlock when
  // all worker slots are occupied by parents. Execute awaited child tasks in
  // the current worker context, while preserving the child's retry policy.
  if (driver === 'inline' || getCurrentTaskExecution()) {
    const maxAttempts = Math.max(
      1,
      options?.retry?.maxAttempts || definition?.retry?.maxAttempts || DEFAULT_REDIS_ATTEMPTS
    )
    const parentExecution = getCurrentTaskExecution()
    for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber++) {
      try {
        const output = await executeRegisteredTask(taskIdentifier, payload, {
          runId: formatTaskRunId(driver, randomUUID()),
          signal: parentExecution?.signal,
          attemptNumber,
          maxAttempts
        })
        return { ok: true, output: output as T }
      } catch (error) {
        if (attemptNumber === maxAttempts) return { ok: false, error }
        const factor = definition?.retry?.factor || 2
        const minimum = definition?.retry?.minTimeoutInMs || DEFAULT_REDIS_BACKOFF_MS
        const maximum = definition?.retry?.maxTimeoutInMs || 60_000
        let delay = Math.min(maximum, minimum * factor ** (attemptNumber - 1))
        if (definition?.retry?.randomize) delay *= 0.5 + Math.random()
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  const handle = await dispatchTask(taskIdentifier, payload, options)
  const timeoutAt = Date.now() + 60 * 60 * 1000
  while (Date.now() < timeoutAt) {
    const run = await getTaskRun(handle.id)
    if (!run) return { ok: false, error: new Error(`Task run disappeared: ${handle.id}`) }
    if (run.status === 'COMPLETED') return { ok: true, output: run.output as T }
    if (['FAILED', 'CANCELED', 'TIMED_OUT', 'CRASHED'].includes(run.status)) {
      return { ok: false, error: run.error || new Error(`Task ended with ${run.status}`) }
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return { ok: false, error: new Error(`Timed out waiting for task: ${taskIdentifier}`) }
}

export async function getTaskRun(runId: string): Promise<TaskRunRecord | null> {
  const { driver, rawId } = parseTaskRunId(runId)

  if (driver === 'redis') {
    const job = await mainTaskQueue.getJob(rawId)
    return job ? redisJobToRun(job) : null
  }

  if (driver === 'inline') {
    return inlineRuns.get(formatTaskRunId('inline', rawId)) || null
  }

  try {
    const run = await runs.retrieve(rawId)
    return {
      id: run.id,
      taskIdentifier: run.taskIdentifier,
      status: run.status,
      startedAt: new Date(run.startedAt || run.createdAt).toISOString(),
      ...(run.finishedAt ? { finishedAt: new Date(run.finishedAt).toISOString() } : {}),
      ...(run.output !== undefined ? { output: run.output } : {}),
      ...(run.error ? { error: run.error } : {}),
      isTest: run.isTest,
      tags: Array.isArray(run.tags) ? run.tags : []
    }
  } catch (error: any) {
    if (error?.status === 404 || error?.message?.toLowerCase().includes('not found')) return null
    throw error
  }
}

export async function listTaskRunsForUser(userId: string, limit = 20): Promise<TaskRunRecord[]> {
  const driver = getTaskDriver()
  if (driver === 'redis') {
    const states = ['active', 'waiting', 'delayed', 'completed', 'failed'] as const
    const scanLimit = Math.max(limit * 10, 500)
    const jobsByState = await Promise.all(
      states.map((state) => mainTaskQueue.getJobs([state], 0, scanLimit - 1, false))
    )
    const uniqueJobs = Array.from(
      new Map(
        jobsByState.flat().map((job) => [`${job.queueName}:${String(job.id)}`, job] as const)
      ).values()
    )
    const redisRuns = await Promise.all(
      uniqueJobs.filter((job) => redisJobTags(job).includes(`user:${userId}`)).map(redisJobToRun)
    )

    // During the migration some tasks intentionally remain Trigger-only. If
    // Trigger is configured, include those runs so the active-run UI does not
    // lose them merely because Redis is the default for new supported tasks.
    const triggerRuns = process.env.TRIGGER_SECRET_KEY
      ? await listTriggerRunsForUser(userId, limit).catch((error) => {
          console.warn('[TaskDispatcher] Failed to list legacy Trigger runs:', error)
          return []
        })
      : []

    return [...redisRuns, ...triggerRuns]
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit)
  }

  if (driver === 'inline') {
    return Array.from(inlineRuns.values())
      .filter((run) => run.tags.includes(`user:${userId}`))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit)
  }

  return listTriggerRunsForUser(userId, limit)
}

async function listTriggerRunsForUser(userId: string, limit: number): Promise<TaskRunRecord[]> {
  // @ts-expect-error Trigger.dev SDK filter types lag the supported runtime API.
  const response = await runs.list({
    filter: {
      tags: [`user:${userId}`],
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
    limit,
    sort: { createdAt: 'desc' }
  })

  return response.data.map((run) => ({
    id: run.id,
    taskIdentifier: run.taskIdentifier,
    status: run.status,
    startedAt: new Date(run.startedAt || run.createdAt).toISOString(),
    ...(run.finishedAt ? { finishedAt: new Date(run.finishedAt).toISOString() } : {}),
    isTest: run.isTest,
    tags: Array.isArray(run.tags) ? run.tags : []
  }))
}

async function listRecentTriggerRuns(limit: number): Promise<TaskRunRecord[]> {
  const response = await runs.list({ limit })
  return response.data.map((run) => ({
    id: run.id,
    taskIdentifier: run.taskIdentifier,
    status: run.status,
    startedAt: new Date(run.startedAt || run.createdAt).toISOString(),
    ...(run.finishedAt ? { finishedAt: new Date(run.finishedAt).toISOString() } : {}),
    isTest: run.isTest,
    tags: Array.isArray(run.tags) ? run.tags : []
  }))
}

/** Lists recent runs across the active driver and any configured legacy Trigger backend. */
export async function listRecentTaskRuns(limit = 50): Promise<TaskRunRecord[]> {
  const driver = getTaskDriver()
  if (driver === 'trigger') return listRecentTriggerRuns(limit)

  const localRuns =
    driver === 'inline'
      ? Array.from(inlineRuns.values())
      : await Promise.all(
          (
            await mainTaskQueue.getJobs(
              ['active', 'waiting', 'delayed', 'completed', 'failed'],
              0,
              Math.max(limit * 2, 100) - 1,
              false
            )
          ).map(redisJobToRun)
        )
  const legacyRuns = process.env.TRIGGER_SECRET_KEY
    ? await listRecentTriggerRuns(limit).catch(() => [])
    : []

  return [...localRuns, ...legacyRuns]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit)
}

export async function cancelTaskRun(
  runId: string
): Promise<{ canceled: boolean; reason?: string }> {
  const { driver, rawId } = parseTaskRunId(runId)
  if (driver === 'redis') {
    const job = await mainTaskQueue.getJob(rawId)
    if (!job) return { canceled: false, reason: 'NOT_FOUND' }
    const state = await job.getState()
    if (state === 'active') return { canceled: false, reason: 'ALREADY_RUNNING' }
    if (state === 'completed' || state === 'failed') {
      return { canceled: false, reason: 'ALREADY_FINISHED' }
    }
    await job.remove({ removeChildren: true })
    return { canceled: true }
  }

  if (driver === 'inline') return { canceled: false, reason: 'ALREADY_FINISHED' }
  await runs.cancel(rawId)
  return { canceled: true }
}

export async function getTaskStatus(
  taskIdentifier: string,
  runId: string,
  userId?: string
): Promise<{ isRunning: boolean; status?: string }> {
  try {
    const run = await getTaskRun(runId)
    if (
      !run ||
      run.taskIdentifier !== taskIdentifier ||
      (userId !== undefined && !run.tags.includes(`user:${userId}`))
    ) {
      return { isRunning: false, status: 'NOT_FOUND' }
    }
    return { isRunning: ACTIVE_RUN_STATUSES.has(run.status), status: run.status }
  } catch {
    return { isRunning: false, status: 'UNKNOWN' }
  }
}

export async function isTaskRunningForUser(
  taskIdentifier: string,
  userId: string
): Promise<boolean> {
  const runsForUser = await listTaskRunsForUser(userId, 100)
  return runsForUser.some(
    (run) =>
      run.taskIdentifier === taskIdentifier &&
      ACTIVE_RUN_STATUSES.has(run.status) &&
      (!run.id.startsWith('run_') || isRunFresh(run))
  )
}
