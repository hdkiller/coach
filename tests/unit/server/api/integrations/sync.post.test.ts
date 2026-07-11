import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'
import { tasks } from '@trigger.dev/sdk/v3'

const prismaMock = vi.hoisted(() => ({
  integration: {
    findUnique: vi.fn(),
    findFirst: vi.fn()
  }
}))

const resolveProviderSyncBlockMock = vi.hoisted(() => vi.fn())
const resolveSyncAllBlockMock = vi.hoisted(() => vi.fn())

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('readBody', async (event: any) => event.body)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  return error
})
vi.stubGlobal('prisma', prismaMock)

vi.mock('../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

vi.mock('../../../../../server/utils/date', () => ({
  getUserTimezone: vi.fn().mockResolvedValue('UTC'),
  getUserLocalDate: vi.fn(() => new Date('2026-03-10T00:00:00.000Z'))
}))

vi.mock('@trigger.dev/sdk/v3', () => ({
  tasks: {
    trigger: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/task-run-events', () => ({
  publishTaskRunStartedEvent: vi.fn()
}))

vi.mock('../../../../../server/utils/integration-sync-guard', () => ({
  resolveProviderSyncBlock: resolveProviderSyncBlockMock,
  resolveSyncAllBlock: resolveSyncAllBlockMock
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/integrations/sync.post')
  return mod.default
}

describe('POST /api/integrations/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.mocked(tasks.trigger).mockResolvedValue({ id: 'job-1' } as any)
    resolveProviderSyncBlockMock.mockResolvedValue({ blocked: false })
    resolveSyncAllBlockMock.mockResolvedValue({ blocked: false })
  })

  it('returns 409 when the provider integration is actively syncing', async () => {
    const handler = await getHandler()

    prismaMock.integration.findUnique.mockResolvedValue({
      id: 'integration-1',
      provider: 'strava',
      syncStatus: 'SYNCING'
    })
    resolveProviderSyncBlockMock.mockResolvedValue({ blocked: true, provider: 'strava' })

    await expect(
      handler({
        body: { provider: 'strava' }
      } as any)
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'strava sync is already in progress. Please wait for it to finish.'
    })

    expect(tasks.trigger).not.toHaveBeenCalled()
  })

  it('returns 409 for sync-all when any integration is actively syncing', async () => {
    const handler = await getHandler()

    resolveSyncAllBlockMock.mockResolvedValue({ blocked: true, provider: 'oura' })

    await expect(
      handler({
        body: { provider: 'all' }
      } as any)
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Sync already in progress for oura. Please wait for it to finish.'
    })

    expect(tasks.trigger).not.toHaveBeenCalled()
  })

  it('starts sync-all after stale sync status is cleared', async () => {
    const handler = await getHandler()

    resolveSyncAllBlockMock.mockResolvedValue({ blocked: false })

    const response = await handler({
      body: { provider: 'all' }
    } as any)

    expect(response).toMatchObject({
      success: true,
      provider: 'all'
    })
    expect(tasks.trigger).toHaveBeenCalledWith(
      'ingest-all',
      expect.objectContaining({ userId: 'user-1', manualSync: true }),
      expect.any(Object)
    )
  })
})
