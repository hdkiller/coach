import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getTaskDriver,
  dispatchTask,
  getTaskStatus
} from '../../../../server/utils/task-dispatcher'
import { mainTaskQueue } from '../../../../server/utils/queue'
import * as triggerCheck from '../../../../server/utils/trigger-check'

vi.mock('../../../../server/utils/queue', () => ({
  mainTaskQueue: {
    add: vi.fn(),
    getJob: vi.fn()
  }
}))

vi.mock('../../../../server/utils/trigger-check', () => ({
  safeTriggerTask: vi.fn(),
  isRunIdRunning: vi.fn()
}))

describe('Task Dispatcher Framework', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetAllMocks()
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

    it('defaults to "trigger" if TRIGGER_SECRET_KEY is present and TASK_QUEUE_DRIVER is omitted', () => {
      delete process.env.TASK_QUEUE_DRIVER
      delete process.env.E2E_MODE
      process.env.TRIGGER_SECRET_KEY = 'tr_prod_secret_123'
      expect(getTaskDriver()).toBe('trigger')
    })

    it('defaults to "redis" if TRIGGER_SECRET_KEY is absent', () => {
      delete process.env.TASK_QUEUE_DRIVER
      delete process.env.TRIGGER_SECRET_KEY
      expect(getTaskDriver()).toBe('redis')
    })
  })

  describe('dispatchTask() execution', () => {
    it('dispatches to Trigger.dev when driver is trigger', async () => {
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

    it('dispatches to BullMQ mainTaskQueue when driver is redis', async () => {
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
            tags: undefined
          }
        },
        {
          jobId: undefined,
          delay: 5000,
          attempts: 3
        }
      )
      expect(result).toEqual({ id: 'redis_job_888' })
    })

    it('executes inline when driver is inline', async () => {
      process.env.TASK_QUEUE_DRIVER = 'inline'

      const result = await dispatchTask('hello-world', {})

      expect(result.id).toMatch(/^inline-run-/)
    })
  })

  describe('getTaskStatus() tracking', () => {
    it('checks trigger run status when driver is trigger', async () => {
      process.env.TASK_QUEUE_DRIVER = 'trigger'
      vi.mocked(triggerCheck.isRunIdRunning).mockResolvedValueOnce(true)

      const status = await getTaskStatus('analyze-workout', 'run_123')

      expect(triggerCheck.isRunIdRunning).toHaveBeenCalledWith('run_123')
      expect(status).toEqual({ isRunning: true })
    })

    it('checks BullMQ job state when driver is redis', async () => {
      process.env.TASK_QUEUE_DRIVER = 'redis'
      vi.mocked(mainTaskQueue.getJob).mockResolvedValueOnce({
        getState: vi.fn().mockResolvedValue('active')
      } as any)

      const status = await getTaskStatus('ingest-strava', 'redis_job_888')

      expect(mainTaskQueue.getJob).toHaveBeenCalledWith('redis_job_888')
      expect(status).toEqual({ isRunning: true, status: 'ACTIVE' })
    })
  })
})
