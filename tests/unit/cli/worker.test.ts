import { describe, expect, it, vi } from 'vitest'
import { registerScheduledTasks } from '../../../cli/worker/start'
import {
  ensureTaskHandlersRegistered,
  getLoadedTaskDefinitions,
  type LoadedTaskDefinition
} from '../../../cli/worker/task-handler-loader'

describe('Worker schedule registration', () => {
  it('upserts BullMQ job schedulers for scheduled tasks and removes stale ones', async () => {
    const mockTaskDefinitions: LoadedTaskDefinition[] = [
      {
        id: 'finalize-daily-nutrition-cron',
        schedule: { cron: '10 2 * * *', timezone: 'UTC' },
        maxDuration: 300
      },
      {
        id: 'poll-ultrahuman',
        schedule: { cron: '5 * * * *', timezone: 'UTC' },
        queue: { name: 'user-ingestion', concurrencyLimit: 5 }
      },
      {
        id: 'deduplicate-workouts',
        maxDuration: 300
      }
    ]

    const existingSchedulers = [
      { key: 'task-schedule:finalize-daily-nutrition-cron' },
      { key: 'task-schedule:obsolete-task-cron' },
      { key: 'other-prefix:some-key' }
    ]

    const removedKeys: string[] = []
    const upsertedSchedulers: Array<{
      id: string
      scheduler: { pattern: string; tz?: string }
      jobTemplate: any
    }> = []

    const mockQueue = {
      getJobSchedulers: vi.fn().mockResolvedValue(existingSchedulers),
      removeJobScheduler: vi.fn().mockImplementation(async (key: string) => {
        removedKeys.push(key)
      }),
      upsertJobScheduler: vi.fn().mockImplementation(async (id, scheduler, jobTemplate) => {
        upsertedSchedulers.push({ id, scheduler, jobTemplate })
      })
    }

    const count = await registerScheduledTasks(mockQueue, mockTaskDefinitions)

    expect(count).toBe(2)
    expect(mockQueue.getJobSchedulers).toHaveBeenCalledWith(0, -1, true)

    // Stale schedule starting with task-schedule: should be removed, while non-matching prefix is kept
    expect(removedKeys).toEqual(['task-schedule:obsolete-task-cron'])

    // Scheduled tasks should be upserted
    expect(upsertedSchedulers).toHaveLength(2)
    expect(upsertedSchedulers[0]).toEqual({
      id: 'task-schedule:finalize-daily-nutrition-cron',
      scheduler: { pattern: '10 2 * * *', tz: 'UTC' },
      jobTemplate: {
        name: 'finalize-daily-nutrition-cron',
        data: {
          schedule: {
            scheduleId: 'task-schedule:finalize-daily-nutrition-cron',
            timezone: 'UTC'
          },
          options: {
            queueName: undefined,
            concurrencyLimit: undefined,
            maxDuration: 300,
            tags: ['system:schedule']
          }
        },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 }
        }
      }
    })

    expect(upsertedSchedulers[1]).toEqual({
      id: 'task-schedule:poll-ultrahuman',
      scheduler: { pattern: '5 * * * *', tz: 'UTC' },
      jobTemplate: {
        name: 'poll-ultrahuman',
        data: {
          schedule: {
            scheduleId: 'task-schedule:poll-ultrahuman',
            timezone: 'UTC'
          },
          options: {
            queueName: 'user-ingestion',
            concurrencyLimit: 5,
            maxDuration: undefined,
            tags: ['system:schedule']
          }
        },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 }
        }
      }
    })
  })

  it('enqueues loaded scheduled tasks from task handler loader', async () => {
    await ensureTaskHandlersRegistered()
    const loadedDefinitions = getLoadedTaskDefinitions()
    const scheduledDefinitions = loadedDefinitions.filter((d) => d.schedule?.cron)

    expect(scheduledDefinitions.length).toBeGreaterThan(0)

    const upserted: string[] = []
    const mockQueue = {
      getJobSchedulers: vi.fn().mockResolvedValue([]),
      removeJobScheduler: vi.fn().mockResolvedValue(true),
      upsertJobScheduler: vi.fn().mockImplementation(async (id: string) => {
        upserted.push(id)
      })
    }

    const count = await registerScheduledTasks(mockQueue, loadedDefinitions)

    expect(count).toBe(scheduledDefinitions.length)
    expect(upserted).toEqual(scheduledDefinitions.map((d) => `task-schedule:${d.id}`))
  })
})
