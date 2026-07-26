import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runs } from '@trigger.dev/sdk/v3'
import {
  cancelTaskRun,
  dispatchTask,
  getTaskDriver,
  getTaskStatus,
  listTaskRunsForUser,
  parseTaskRunId
} from '../../../../server/utils/task-dispatcher'
import { mainTaskQueue } from '../../../../server/utils/queue'
import { executeRegisteredTask, hasTaskHandler } from '../../../../server/utils/task-registry'
import * as triggerCheck from '../../../../server/utils/trigger-check'

vi.mock('@trigger.dev/sdk/v3', () => ({
  runs: {
    retrieve: vi.fn(),
    list: vi.fn(),
    cancel: vi.fn()
  },
  tasks: { triggerAndWait: vi.fn() }
}))

vi.mock('../../../../server/utils/queue', () => ({
  mainTaskQueue: {
    add: vi.fn(),
    getJob: vi.fn(),
    getJobs: vi.fn()
  }
}))

vi.mock('../../../../server/utils/task-registry', () => ({
  executeRegisteredTask: vi.fn(),
  getCurrentTaskExecution: vi.fn(),
  hasTaskHandler: vi.fn()
}))

vi.mock('../../../../server/utils/trigger-check', () => ({
  safeTriggerTask: vi.fn()
}))

function redisJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'redis_job_888',
    name: 'ingest-strava',
    data: { options: { tags: ['user:u1'] } },
    timestamp: Date.now(),
    processedOn: Date.now(),
    finishedOn: undefined,
    returnvalue: undefined,
    failedReason: undefined,
    getState: vi.fn().mockResolvedValue('active'),
    remove: vi.fn(),
    queueName: 'mainTaskQueue',
    ...overrides
  }
}

describe('Task Dispatcher Framework', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(hasTaskHandler).mockImplementation((taskId) => taskId !== 'trigger-only-task')
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getTaskDriver() resolution', () => {
    it('returns explicit TASK_QUEUE_DRIVER env setting if specified', () => {
      process.env.TASK_QUEUE_DRIVER = 'redis'
      expect(getTaskDriver()).toBe('redis')

      process.env.TASK_QUEUE_DRIVER = 'trigger'
      expect(getTaskDriver()).toBe('trigger')

      process.env.TASK_QUEUE_DRIVER = 'inline'
      expect(getTaskDriver()).toBe('inline')
    })

    it('defaults to trigger if TRIGGER_SECRET_KEY is present outside E2E', () => {
      delete process.env.TASK_QUEUE_DRIVER
      delete process.env.E2E_MODE
      process.env.TRIGGER_SECRET_KEY = 'tr_prod_secret_123'
      expect(getTaskDriver()).toBe('trigger')
    })

    it('defaults to redis if TRIGGER_SECRET_KEY is absent', () => {
      delete process.env.TASK_QUEUE_DRIVER
      delete process.env.TRIGGER_SECRET_KEY
      expect(getTaskDriver()).toBe('redis')
    })

    it('recognizes legacy Trigger IDs after changing the configured driver', () => {
      process.env.TASK_QUEUE_DRIVER = 'redis'
      expect(parseTaskRunId('run_123')).toEqual({ driver: 'trigger', rawId: 'run_123' })
    })
  })

  describe('dispatchTask() execution', () => {
    it('dispatches to Trigger.dev without manufacturing empty options', async () => {
      process.env.TASK_QUEUE_DRIVER = 'trigger'
      vi.mocked(triggerCheck.safeTriggerTask).mockResolvedValueOnce({ id: 'run_trigger_999' })

      const result = await dispatchTask('analyze-workout', { workoutId: 'w123' })

      expect(triggerCheck.safeTriggerTask).toHaveBeenCalledWith(
        'analyze-workout',
        { workoutId: 'w123' },
        undefined
      )
      expect(result).toEqual({ id: 'run_trigger_999' })
    })

    it('dispatches to BullMQ with retry/backoff metadata and a prefixed run ID', async () => {
      process.env.TASK_QUEUE_DRIVER = 'redis'
      vi.mocked(mainTaskQueue.add).mockResolvedValueOnce({ id: 'redis_job_888' } as any)

      const result = await dispatchTask(
        'ingest-strava',
        { userId: 'u1' },
        {
          concurrencyKey: 'u1',
          delay: 5000,
          retry: { maxAttempts: 3 }
        }
      )

      expect(mainTaskQueue.add).toHaveBeenCalledWith(
        'ingest-strava',
        {
          payload: { userId: 'u1' },
          options: {
            concurrencyKey: 'u1',
            tags: undefined,
            queueName: 'user-ingestion',
            concurrencyLimit: 5,
            maxDuration: 1800
          }
        },
        {
          jobId: undefined,
          delay: 5000,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 }
        }
      )
      expect(result).toEqual({ id: 'redis:redis_job_888' })
    })

    it('rejects tasks that the Redis worker has not registered', async () => {
      process.env.TASK_QUEUE_DRIVER = 'redis'

      await expect(dispatchTask('trigger-only-task', {})).rejects.toThrow(
        'Task is not available with the Redis driver: trigger-only-task'
      )
      expect(mainTaskQueue.add).not.toHaveBeenCalled()
    })

    it('executes the registered handler inline and retains its result', async () => {
      process.env.TASK_QUEUE_DRIVER = 'inline'
      vi.mocked(executeRegisteredTask).mockResolvedValueOnce({ success: true })

      const result = await dispatchTask('hello-world', {})

      expect(executeRegisteredTask).toHaveBeenCalledWith('hello-world', {})
      expect(result.id).toMatch(/^inline:/)
      await expect(getTaskStatus('hello-world', result.id)).resolves.toEqual({
        isRunning: false,
        status: 'COMPLETED'
      })
    })
  })

  describe('getTaskStatus() tracking', () => {
    it('checks Trigger run status and task identity', async () => {
      vi.mocked(runs.retrieve).mockResolvedValueOnce({
        id: 'run_123',
        taskIdentifier: 'analyze-workout',
        status: 'EXECUTING',
        createdAt: new Date(),
        tags: ['user:u1']
      } as any)

      const status = await getTaskStatus('analyze-workout', 'run_123', 'u1')

      expect(runs.retrieve).toHaveBeenCalledWith('run_123')
      expect(status).toEqual({ isRunning: true, status: 'EXECUTING' })
    })

    it('normalizes BullMQ job state and verifies ownership', async () => {
      process.env.TASK_QUEUE_DRIVER = 'redis'
      vi.mocked(mainTaskQueue.getJob).mockResolvedValue(redisJob() as any)

      await expect(getTaskStatus('ingest-strava', 'redis:redis_job_888', 'u1')).resolves.toEqual({
        isRunning: true,
        status: 'EXECUTING'
      })
      await expect(getTaskStatus('ingest-strava', 'redis:redis_job_888', 'u2')).resolves.toEqual({
        isRunning: false,
        status: 'NOT_FOUND'
      })
    })
  })

  describe('Redis run management', () => {
    it('lists tagged jobs across BullMQ states and filters out other users', async () => {
      process.env.TASK_QUEUE_DRIVER = 'redis'
      delete process.env.TRIGGER_SECRET_KEY
      const ownedJob = redisJob()
      const foreignJob = redisJob({
        id: 'foreign-job',
        data: { options: { tags: ['user:u2'] } }
      })
      vi.mocked(mainTaskQueue.getJobs).mockImplementation(async (states: any) =>
        states.includes('active') ? ([ownedJob, foreignJob] as any) : []
      )

      const result = await listTaskRunsForUser('u1')

      expect(mainTaskQueue.getJobs).toHaveBeenCalledTimes(5)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'redis:redis_job_888',
        taskIdentifier: 'ingest-strava',
        status: 'EXECUTING',
        tags: ['user:u1']
      })
    })

    it('cancels a queued Redis job but refuses an active one', async () => {
      process.env.TASK_QUEUE_DRIVER = 'redis'
      const queuedJob = redisJob({ getState: vi.fn().mockResolvedValue('waiting') })
      vi.mocked(mainTaskQueue.getJob).mockResolvedValueOnce(queuedJob as any)

      await expect(cancelTaskRun('redis:redis_job_888')).resolves.toEqual({ canceled: true })
      expect(queuedJob.remove).toHaveBeenCalledWith({ removeChildren: true })

      vi.mocked(mainTaskQueue.getJob).mockResolvedValueOnce(redisJob() as any)
      await expect(cancelTaskRun('redis:redis_job_888')).resolves.toEqual({
        canceled: false,
        reason: 'ALREADY_RUNNING'
      })
    })
  })
})
