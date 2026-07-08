import { beforeEach, describe, expect, it, vi } from 'vitest'

const { syncQueueFindMany, syncQueueUpdateMany, syncQueueUpdate, processSyncQueueItem } =
  vi.hoisted(() => ({
    syncQueueFindMany: vi.fn(),
    syncQueueUpdateMany: vi.fn(),
    syncQueueUpdate: vi.fn(),
    processSyncQueueItem: vi.fn()
  }))

vi.mock('../../../server/utils/db', () => ({
  prisma: {
    syncQueue: {
      findMany: syncQueueFindMany,
      updateMany: syncQueueUpdateMany,
      update: syncQueueUpdate
    }
  }
}))

vi.mock('../../../server/utils/intervals-sync', () => ({
  processSyncQueueItem
}))

vi.mock('../../../trigger/init', () => ({}))

vi.mock('@trigger.dev/sdk/v3', async () => {
  const actual = await vi.importActual('@trigger.dev/sdk/v3')
  return {
    ...actual,
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    },
    task: vi.fn().mockImplementation((config) => ({
      run: config.run,
      id: config.id
    }))
  }
})

describe('processSyncQueueTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('atomically claims pending items before processing them', async () => {
    syncQueueFindMany.mockResolvedValue([
      {
        id: 'queue-1',
        entityType: 'plannedWorkout',
        entityId: 'planned-1',
        operation: 'UPDATE',
        attempts: 0
      }
    ])
    syncQueueUpdateMany.mockResolvedValue({ count: 1 })
    processSyncQueueItem.mockResolvedValue(true)
    syncQueueUpdate.mockResolvedValue({})

    const { processSyncQueueTask } = await import('../../../trigger/process-sync-queue')
    await processSyncQueueTask.run({})

    expect(syncQueueUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'queue-1',
        status: 'PENDING'
      },
      data: {
        status: 'PROCESSING',
        lastAttempt: expect.any(Date)
      }
    })
    expect(processSyncQueueItem).toHaveBeenCalled()
  })

  it('skips items that were already claimed by another worker', async () => {
    syncQueueFindMany.mockResolvedValue([
      {
        id: 'queue-1',
        entityType: 'plannedWorkout',
        entityId: 'planned-1',
        operation: 'UPDATE',
        attempts: 0
      }
    ])
    syncQueueUpdateMany.mockResolvedValue({ count: 0 })

    const { processSyncQueueTask } = await import('../../../trigger/process-sync-queue')
    await processSyncQueueTask.run({})

    expect(processSyncQueueItem).not.toHaveBeenCalled()
    expect(syncQueueUpdate).not.toHaveBeenCalled()
  })
})
