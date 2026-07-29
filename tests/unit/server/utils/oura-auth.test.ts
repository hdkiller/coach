import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ensureValidOuraToken, refreshOuraToken } from '../../../../server/utils/oura'
import {
  IntegrationAuthError,
  IntegrationProviderError
} from '../../../../server/utils/integration-errors'

const { prismaIntegrationFindUnique, prismaIntegrationUpdate, prismaQueryRaw, prismaTransaction } =
  vi.hoisted(() => ({
    prismaIntegrationFindUnique: vi.fn(),
    prismaIntegrationUpdate: vi.fn(),
    prismaQueryRaw: vi.fn(),
    prismaTransaction: vi.fn()
  }))

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    $transaction: prismaTransaction,
    integration: {
      findUnique: prismaIntegrationFindUnique,
      update: prismaIntegrationUpdate
    }
  }
}))

beforeEach(() => {
  prismaIntegrationFindUnique.mockReset()
  prismaIntegrationUpdate.mockReset()
  prismaQueryRaw.mockReset()
  prismaTransaction.mockReset()
  prismaQueryRaw.mockResolvedValue([])
  prismaTransaction.mockImplementation(async (callback: (transaction: unknown) => unknown) =>
    callback({
      $queryRaw: prismaQueryRaw,
      integration: {
        findUnique: prismaIntegrationFindUnique,
        update: prismaIntegrationUpdate
      }
    })
  )
  vi.restoreAllMocks()
  process.env.OURA_CLIENT_ID = 'test-client-id'
  process.env.OURA_CLIENT_SECRET = 'test-client-secret'
})

describe('Oura token refresh auth failures', () => {
  it('marks the integration for reconnection on invalid_request 400 and throws IntegrationAuthError', async () => {
    const integration = {
      id: 'integration-invalid-refresh',
      accessToken: 'expired-token',
      refreshToken: 'invalid-refresh-token',
      expiresAt: new Date(Date.now() - 1000),
      syncStatus: 'SUCCESS',
      errorMessage: null
    } as any

    prismaIntegrationFindUnique.mockResolvedValue(integration)

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () =>
          JSON.stringify({
            status: 400,
            error: 'invalid_request',
            error_description: 'Invalid request'
          })
      }) as any
    )

    const error = await refreshOuraToken(integration).catch((err) => err)
    expect(error).toBeInstanceOf(IntegrationAuthError)
    expect(error).toMatchObject({
      name: 'IntegrationAuthError',
      code: 'AUTH_REVOKED',
      provider: 'oura',
      integrationId: integration.id,
      statusCode: 400,
      message: 'Oura authorization expired or was revoked. Please reconnect Oura.',
      retryable: false
    })

    expect(prismaIntegrationUpdate).toHaveBeenCalledWith({
      where: { id: integration.id },
      data: {
        syncStatus: 'FAILED',
        errorMessage: 'Oura authorization expired or was revoked. Please reconnect Oura.'
      }
    })

    const logged = errorSpy.mock.calls.find((call) => call[0] === 'Oura token refresh failed:')
    expect(logged?.[1]).toMatchObject({
      integrationId: integration.id,
      status: 400,
      error: 'invalid_request',
      errorDescription: 'Invalid request'
    })
    expect(JSON.stringify(logged?.[1])).not.toContain('invalid-refresh-token')
    expect(JSON.stringify(logged?.[1])).not.toContain('test-client-secret')
  })

  it('classifies invalid_grant 400 as an unrecoverable auth failure', async () => {
    const integration = {
      id: 'integration-invalid-grant',
      accessToken: 'expired-token',
      refreshToken: 'revoked-refresh-token',
      expiresAt: new Date(Date.now() - 1000)
    } as any

    prismaIntegrationFindUnique.mockResolvedValue(integration)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ error: 'invalid_grant' })
      }) as any
    )

    await expect(refreshOuraToken(integration)).rejects.toBeInstanceOf(IntegrationAuthError)
    expect(prismaIntegrationUpdate).toHaveBeenCalledWith({
      where: { id: integration.id },
      data: {
        syncStatus: 'FAILED',
        errorMessage: 'Oura authorization expired or was revoked. Please reconnect Oura.'
      }
    })
  })

  it('does not call Oura again when the integration already requires reconnection', async () => {
    const integration = {
      id: 'integration-already-failed',
      accessToken: 'expired-token',
      refreshToken: 'invalid-refresh-token',
      expiresAt: new Date(Date.now() - 1000),
      syncStatus: 'FAILED',
      errorMessage: 'Oura authorization expired or was revoked. Please reconnect Oura.'
    } as any

    prismaIntegrationFindUnique.mockResolvedValue(integration)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock as any)

    await expect(refreshOuraToken(integration)).rejects.toBeInstanceOf(IntegrationAuthError)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(prismaIntegrationUpdate).not.toHaveBeenCalled()
  })

  it('surfaces provider unavailable errors for Oura 5xx refresh failures without marking reconnect', async () => {
    const integration = {
      id: 'integration-oura-5xx',
      accessToken: 'expired-token',
      refreshToken: 'refresh-token',
      expiresAt: new Date(Date.now() - 1000)
    } as any

    prismaIntegrationFindUnique.mockResolvedValue(integration)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'upstream down'
      }) as any
    )

    await expect(refreshOuraToken(integration)).rejects.toBeInstanceOf(IntegrationProviderError)
    expect(prismaIntegrationUpdate).not.toHaveBeenCalled()
  })
})

describe('Oura concurrent refresh callers', () => {
  it('serializes concurrent refreshes and reuses the rotated credentials', async () => {
    const expiredIntegration = {
      id: 'integration-concurrent-refresh',
      accessToken: 'expired-token',
      refreshToken: 'old-refresh-token',
      expiresAt: new Date(Date.now() - 1000)
    } as any
    let storedIntegration = expiredIntegration
    let transactionQueue = Promise.resolve()

    prismaIntegrationFindUnique.mockImplementation(async () => storedIntegration)
    prismaIntegrationUpdate.mockImplementation(async ({ data }) => {
      storedIntegration = { ...storedIntegration, ...data }
      return storedIntegration
    })
    prismaTransaction.mockImplementation((callback: (transaction: unknown) => Promise<unknown>) => {
      const result = transactionQueue.then(() =>
        callback({
          $queryRaw: prismaQueryRaw,
          integration: {
            findUnique: prismaIntegrationFindUnique,
            update: prismaIntegrationUpdate
          }
        })
      )
      transactionQueue = result.then(
        () => undefined,
        () => undefined
      )
      return result
    })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'fresh-token',
        refresh_token: 'fresh-refresh-token',
        expires_in: 86_400,
        scope: 'email personal daily',
        token_type: 'bearer'
      })
    })
    vi.stubGlobal('fetch', fetchMock as any)

    const [first, second] = await Promise.all([
      refreshOuraToken(expiredIntegration),
      refreshOuraToken(expiredIntegration)
    ])

    expect(first.accessToken).toBe('fresh-token')
    expect(second.accessToken).toBe('fresh-token')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(prismaIntegrationUpdate).toHaveBeenCalledTimes(1)
  })

  it('uses credentials refreshed by another caller without marking the integration failed', async () => {
    const staleIntegration = {
      id: 'integration-stale-refresh',
      accessToken: 'expired-token',
      refreshToken: 'old-refresh-token',
      expiresAt: new Date(Date.now() - 1000)
    } as any
    const refreshedIntegration = {
      ...staleIntegration,
      accessToken: 'fresh-token',
      refreshToken: 'fresh-refresh-token',
      expiresAt: new Date(Date.now() + 86_400_000)
    }
    prismaIntegrationFindUnique.mockResolvedValue(refreshedIntegration)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock as any)

    await expect(refreshOuraToken(staleIntegration)).resolves.toBe(refreshedIntegration)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(prismaIntegrationUpdate).not.toHaveBeenCalled()
  })

  it('re-reads fresh credentials for callers holding a stale integration object', async () => {
    const staleIntegration = {
      id: 'integration-ensure-stale',
      accessToken: 'expired-token',
      refreshToken: 'old-refresh-token',
      expiresAt: new Date(Date.now() - 1000)
    } as any
    const refreshedIntegration = {
      ...staleIntegration,
      accessToken: 'fresh-token',
      refreshToken: 'fresh-refresh-token',
      expiresAt: new Date(Date.now() + 86_400_000)
    }
    prismaIntegrationFindUnique.mockResolvedValue(refreshedIntegration)

    await expect(ensureValidOuraToken(staleIntegration)).resolves.toBe(refreshedIntegration)
    expect(prismaTransaction).not.toHaveBeenCalled()
  })

  it('only one concurrent invalid refresh marks FAILED and all callers get IntegrationAuthError', async () => {
    const expiredIntegration = {
      id: 'integration-concurrent-invalid',
      accessToken: 'expired-token',
      refreshToken: 'invalid-refresh-token',
      expiresAt: new Date(Date.now() - 1000),
      syncStatus: 'SUCCESS',
      errorMessage: null
    } as any
    let storedIntegration = { ...expiredIntegration }
    let transactionQueue = Promise.resolve()

    prismaIntegrationFindUnique.mockImplementation(async () => storedIntegration)
    prismaIntegrationUpdate.mockImplementation(async ({ data }) => {
      storedIntegration = { ...storedIntegration, ...data }
      return storedIntegration
    })
    prismaTransaction.mockImplementation((callback: (transaction: unknown) => Promise<unknown>) => {
      const result = transactionQueue.then(() =>
        callback({
          $queryRaw: prismaQueryRaw,
          integration: {
            findUnique: prismaIntegrationFindUnique,
            update: prismaIntegrationUpdate
          }
        })
      )
      transactionQueue = result.then(
        () => undefined,
        () => undefined
      )
      return result
    })

    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () =>
        JSON.stringify({
          status: 400,
          error: 'invalid_request',
          error_description: 'Invalid request'
        })
    })
    vi.stubGlobal('fetch', fetchMock as any)

    const results = await Promise.allSettled([
      refreshOuraToken(expiredIntegration),
      refreshOuraToken(expiredIntegration),
      refreshOuraToken(expiredIntegration)
    ])

    expect(results.every((r) => r.status === 'rejected')).toBe(true)
    for (const result of results) {
      expect(result.status).toBe('rejected')
      if (result.status === 'rejected') {
        expect(result.reason).toBeInstanceOf(IntegrationAuthError)
        expect(String(result.reason.message)).not.toContain('invalid-refresh-token')
      }
    }
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(prismaIntegrationUpdate).toHaveBeenCalledTimes(1)
    expect(storedIntegration.syncStatus).toBe('FAILED')
  })
})
