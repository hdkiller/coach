import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchGarminActivityFile,
  fetchGarminData,
  hasGarminPermission,
  mergeGarminScopes,
  parseGarminScope
} from '../../../../server/utils/garmin'

const { prismaIntegrationFindUnique, prismaIntegrationUpdate } = vi.hoisted(() => ({
  prismaIntegrationFindUnique: vi.fn(),
  prismaIntegrationUpdate: vi.fn()
}))

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    integration: {
      findUnique: prismaIntegrationFindUnique,
      update: prismaIntegrationUpdate
    }
  }
}))

beforeEach(() => {
  prismaIntegrationFindUnique.mockReset()
  prismaIntegrationUpdate.mockReset()
  vi.restoreAllMocks()
  process.env.GARMIN_CLIENT_ID = 'test-client-id'
  process.env.GARMIN_CLIENT_SECRET = 'test-client-secret'
})

describe('Garmin permission helpers', () => {
  it('parses and normalizes Garmin scope strings', () => {
    expect(parseGarminScope('partner_write connect_read  workout_import')).toEqual(
      new Set(['PARTNER_WRITE', 'CONNECT_READ', 'WORKOUT_IMPORT'])
    )
  })

  it('treats PARTNER_WRITE as sufficient for Garmin import permissions', () => {
    const scopes = parseGarminScope('PARTNER_WRITE CONNECT_READ')

    expect(hasGarminPermission(scopes, 'WORKOUT_IMPORT')).toBe(true)
    expect(hasGarminPermission(scopes, 'COURSE_IMPORT')).toBe(true)
  })

  it('merges stored OAuth scopes with fetched Garmin permissions', () => {
    expect(mergeGarminScopes('PARTNER_WRITE CONNECT_READ', ['workout_import'])).toEqual(
      new Set(['PARTNER_WRITE', 'CONNECT_READ', 'WORKOUT_IMPORT'])
    )
  })
})

describe('Garmin auth retry', () => {
  it('refreshes and retries summary requests when Garmin reports an inactive token', async () => {
    const integration = {
      id: 'integration-1',
      accessToken: 'expired-token',
      refreshToken: 'refresh-token',
      expiresAt: new Date(Date.now() + 3600_000)
    } as any

    prismaIntegrationFindUnique.mockResolvedValue(integration)
    prismaIntegrationUpdate.mockResolvedValue({
      ...integration,
      accessToken: 'fresh-token',
      refreshToken: 'fresh-refresh-token',
      expiresAt: new Date(Date.now() + 3600_000)
    })

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ errorMessage: 'Token is not active' }),
        headers: new Headers()
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'fresh-token',
          refresh_token: 'fresh-refresh-token',
          expires_in: 3600
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true })
      })

    vi.stubGlobal('fetch', fetchMock as any)

    const result = await fetchGarminData(
      integration,
      'https://apis.garmin.com/wellness-api/rest/dailies'
    )

    expect(result).toEqual({ ok: true })
    expect(prismaIntegrationUpdate).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://diauth.garmin.com/di-oauth2-service/oauth/token'
    )
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer fresh-token'
    })
  })

  it('refreshes and retries FIT file fetches when Garmin reports an inactive token', async () => {
    const integration = {
      id: 'integration-2',
      accessToken: 'expired-token',
      refreshToken: 'refresh-token',
      expiresAt: new Date(Date.now() + 3600_000)
    } as any

    prismaIntegrationFindUnique.mockResolvedValue(integration)
    prismaIntegrationUpdate.mockResolvedValue({
      ...integration,
      accessToken: 'fresh-token',
      refreshToken: 'fresh-refresh-token',
      expiresAt: new Date(Date.now() + 3600_000)
    })

    const fileBytes = new Uint8Array([1, 2, 3, 4])
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ errorMessage: 'Token is not active' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'fresh-token',
          refresh_token: 'fresh-refresh-token',
          expires_in: 3600
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => fileBytes.buffer
      })

    vi.stubGlobal('fetch', fetchMock as any)

    const buffer = await fetchGarminActivityFile(integration, 'activity-123')

    expect([...buffer]).toEqual([1, 2, 3, 4])
    expect(prismaIntegrationUpdate).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer fresh-token'
    })
  })
})
