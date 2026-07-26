import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  integration: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn()
  }
}))

const isTaskRunningMock = vi.hoisted(() => vi.fn())

vi.stubGlobal('prisma', prismaMock)

vi.mock('../../../../server/utils/db', () => ({
  prisma: prismaMock
}))

vi.mock('../../../../server/utils/task-dispatcher', () => ({
  isTaskRunningForUser: isTaskRunningMock
}))

describe('integration-sync-guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.integration.update.mockResolvedValue({})
  })

  it('clears stale SYNCING status when no ingest task is running', async () => {
    isTaskRunningMock.mockResolvedValue(false)

    const { resolveProviderSyncBlock } =
      await import('../../../../server/utils/integration-sync-guard')

    const result = await resolveProviderSyncBlock('user-1', {
      id: 'integration-oura',
      provider: 'oura',
      syncStatus: 'SYNCING'
    })

    expect(result).toEqual({ blocked: false })
    expect(prismaMock.integration.update).toHaveBeenCalledWith({
      where: { id: 'integration-oura' },
      data: {
        syncStatus: 'FAILED',
        errorMessage: 'Previous sync did not complete'
      }
    })
  })

  it('blocks provider sync when the ingest task is actively running', async () => {
    isTaskRunningMock.mockImplementation(async (taskId: string) => taskId === 'ingest-oura')

    const { resolveProviderSyncBlock } =
      await import('../../../../server/utils/integration-sync-guard')

    const result = await resolveProviderSyncBlock('user-1', {
      id: 'integration-oura',
      provider: 'oura',
      syncStatus: 'SYNCING'
    })

    expect(result).toEqual({ blocked: true, provider: 'oura', reason: 'provider' })
    expect(prismaMock.integration.update).not.toHaveBeenCalled()
  })

  it('clears stale integrations and allows sync-all when no tasks are running', async () => {
    isTaskRunningMock.mockResolvedValue(false)
    prismaMock.integration.findMany.mockResolvedValue([
      { id: 'integration-oura', provider: 'oura', syncStatus: 'SYNCING' }
    ])

    const { resolveSyncAllBlock } = await import('../../../../server/utils/integration-sync-guard')

    const result = await resolveSyncAllBlock('user-1')

    expect(result).toEqual({ blocked: false })
    expect(prismaMock.integration.update).toHaveBeenCalledTimes(1)
  })

  it('blocks sync-all when ingest-all is running', async () => {
    isTaskRunningMock.mockImplementation(async (taskId: string) => taskId === 'ingest-all')
    prismaMock.integration.findFirst.mockResolvedValue({ provider: 'oura' })

    const { resolveSyncAllBlock } = await import('../../../../server/utils/integration-sync-guard')

    const result = await resolveSyncAllBlock('user-1')

    expect(result).toEqual({ blocked: true, provider: 'oura', reason: 'ingest-all' })
    expect(prismaMock.integration.update).not.toHaveBeenCalled()
  })

  it('blocks sync-all when a provider ingest task is actively running', async () => {
    isTaskRunningMock.mockImplementation(async (taskId: string) => taskId === 'ingest-oura')
    prismaMock.integration.findMany.mockResolvedValue([
      { id: 'integration-oura', provider: 'oura', syncStatus: 'SYNCING' }
    ])

    const { resolveSyncAllBlock } = await import('../../../../server/utils/integration-sync-guard')

    const result = await resolveSyncAllBlock('user-1')

    expect(result).toEqual({ blocked: true, provider: 'oura', reason: 'provider' })
  })

  it('formats sync-in-progress messages for batch and provider blocks', async () => {
    const { formatSyncInProgressMessage } =
      await import('../../../../server/utils/integration-sync-guard')

    expect(formatSyncInProgressMessage({ provider: 'all', reason: 'ingest-all' })).toContain(
      'all connected apps'
    )
    expect(formatSyncInProgressMessage({ provider: 'oura', reason: 'ingest-all' })).toContain(
      'oura'
    )
    expect(formatSyncInProgressMessage({ provider: 'oura', reason: 'provider' })).toContain(
      'Sync All will be available'
    )
  })
})
