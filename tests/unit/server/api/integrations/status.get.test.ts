import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../server/utils/auth-guard'
import { resolveProviderSyncBlock } from '../../../../../server/utils/integration-sync-guard'

const prismaMock = {
  user: {
    findUnique: vi.fn()
  },
  oAuthToken: {
    groupBy: vi.fn()
  },
  integration: {
    create: vi.fn()
  }
}

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  return error
})
vi.stubGlobal('prisma', prismaMock)

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

vi.mock('../../../../../server/utils/integration-sync-guard', () => ({
  resolveProviderSyncBlock: vi.fn()
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/integrations/status.get')
  return mod.default
}

describe('GET /api/integrations/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(prismaMock.oAuthToken.groupBy).mockResolvedValue([])
    vi.mocked(resolveProviderSyncBlock).mockResolvedValue({ blocked: false })
  })

  it('repairs stale SYNCING state when no provider task is running', async () => {
    const handler = await getHandler()
    vi.mocked(prismaMock.user.findUnique).mockResolvedValue({
      id: 'user-1',
      integrations: [
        {
          id: 'int-intervals',
          provider: 'intervals',
          lastSyncAt: null,
          syncStatus: 'SYNCING',
          externalUserId: 'i-1',
          ingestWorkouts: true,
          settings: {},
          errorMessage: null
        }
      ],
      oauthConsents: [],
      accounts: []
    } as any)

    const result = await handler({} as any)

    expect(resolveProviderSyncBlock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ id: 'int-intervals', provider: 'intervals' })
    )
    expect(result.integrations[0]).toMatchObject({
      syncStatus: 'FAILED',
      errorMessage: 'Previous sync did not complete'
    })
  })

  it('preserves SYNCING state while the provider task is active', async () => {
    const handler = await getHandler()
    vi.mocked(resolveProviderSyncBlock).mockResolvedValue({
      blocked: true,
      provider: 'intervals',
      reason: 'provider'
    })
    vi.mocked(prismaMock.user.findUnique).mockResolvedValue({
      id: 'user-1',
      integrations: [
        {
          id: 'int-intervals',
          provider: 'intervals',
          lastSyncAt: null,
          syncStatus: 'SYNCING',
          externalUserId: 'i-1',
          ingestWorkouts: true,
          settings: {},
          errorMessage: null
        }
      ],
      oauthConsents: [],
      accounts: []
    } as any)

    const result = await handler({} as any)

    expect(result.integrations[0].syncStatus).toBe('SYNCING')
  })

  it('requires profile:read and returns status without provider tokens', async () => {
    const handler = await getHandler()

    vi.mocked(prismaMock.user.findUnique).mockResolvedValue({
      id: 'user-1',
      integrations: [
        {
          id: 'int-garmin',
          provider: 'garmin',
          lastSyncAt: new Date('2026-07-20T12:00:00Z'),
          syncStatus: 'SUCCESS',
          externalUserId: 'g-1',
          ingestWorkouts: true,
          settings: { foo: 'bar' },
          errorMessage: null
        }
      ],
      oauthConsents: [],
      accounts: []
    } as any)

    const result = await handler({} as any)

    expect(requireAuth).toHaveBeenCalledWith(expect.anything(), ['profile:read'])
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } })
    )
    expect(result.integrations).toHaveLength(1)
    expect(result.integrations[0]).toMatchObject({
      id: 'int-garmin',
      provider: 'garmin',
      syncStatus: 'SUCCESS'
    })
    expect(JSON.stringify(result)).not.toMatch(/access[_]?[Tt]oken|refresh[_]?[Tt]oken/)
  })

  it('propagates 403 when Bearer token is missing profile:read', async () => {
    const handler = await getHandler()
    const forbidden = Object.assign(
      new Error('Insufficient permissions. Required scopes: profile:read'),
      {
        statusCode: 403
      }
    )
    vi.mocked(requireAuth).mockRejectedValue(forbidden)

    await expect(handler({} as any)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Insufficient permissions. Required scopes: profile:read'
    })
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })
})
