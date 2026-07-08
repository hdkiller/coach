import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'
import { tasks } from '@trigger.dev/sdk/v3'

const prismaMock = vi.hoisted(() => ({
  integration: {
    findUnique: vi.fn(),
    findFirst: vi.fn()
  }
}))

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

const getHandler = async () => {
  const mod = await import('../../../../../server/api/integrations/sync.post')
  return mod.default
}

describe('POST /api/integrations/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.mocked(tasks.trigger).mockResolvedValue({ id: 'job-1' } as any)
  })

  it('returns 409 when the provider integration is already syncing', async () => {
    const handler = await getHandler()

    prismaMock.integration.findUnique.mockResolvedValue({
      id: 'integration-1',
      provider: 'strava',
      syncStatus: 'SYNCING'
    })

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

  it('returns 409 for sync-all when any integration is syncing', async () => {
    const handler = await getHandler()

    prismaMock.integration.findFirst.mockResolvedValue({
      provider: 'garmin'
    })

    await expect(
      handler({
        body: { provider: 'all' }
      } as any)
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Sync already in progress for garmin. Please wait for it to finish.'
    })

    expect(tasks.trigger).not.toHaveBeenCalled()
  })
})
