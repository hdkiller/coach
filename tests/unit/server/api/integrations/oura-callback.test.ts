import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'
import { fetchOuraPersonalInfo } from '../../../../../server/utils/oura'

const prismaMock = {
  user: {
    findUnique: vi.fn()
  },
  integration: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
}

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', vi.fn())
vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'https://coachwatts.com' } }))
vi.stubGlobal('getQuery', (event: any) => event.query || {})
vi.stubGlobal('getCookie', (event: any, key: string) => event.cookies?.[key])
vi.stubGlobal('deleteCookie', (event: any, key: string) => {
  event.deletedCookies = event.deletedCookies || []
  event.deletedCookies.push(key)
})
vi.stubGlobal('sendRedirect', (_event: any, location: string) => ({ redirect: location }))
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})
vi.stubGlobal('prisma', prismaMock)

vi.mock('nuxt/app', () => ({
  useRuntimeConfig: () => ({ public: { siteUrl: 'https://coachwatts.com' } }),
  useNuxtApp: () => ({ $config: { public: { siteUrl: 'https://coachwatts.com' } } })
}))

vi.mock('../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

vi.mock('../../../../../server/utils/oura', () => ({
  fetchOuraPersonalInfo: vi.fn()
}))

const OURA_SCOPE =
  'email personal daily sleep daily activity daily readiness heartrate spo2Daily workout session tag'

const getCallbackHandler = async () => {
  vi.resetModules()
  const mod = await import('../../../../../server/api/integrations/oura/callback.get')
  return mod.default
}

describe('Oura OAuth callback scope persistence (CW-217)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OURA_CLIENT_ID = 'test-oura-client-id'
    process.env.OURA_CLIENT_SECRET = 'test-oura-client-secret'

    vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'https://coachwatts.com' } }))
    vi.stubGlobal('prisma', prismaMock)

    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'athlete@example.com' }
    } as any)

    vi.mocked(fetchOuraPersonalInfo).mockResolvedValue({
      id: 'oura-user-123',
      email: 'athlete@example.com'
    } as any)

    vi.mocked(prismaMock.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'athlete@example.com'
    } as any)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 86400,
          scope: OURA_SCOPE,
          token_type: 'Bearer'
        })
      })
    )
  })

  it('persists scope when creating a new Oura integration', async () => {
    vi.mocked(prismaMock.integration.findFirst).mockResolvedValue(null)
    vi.mocked(prismaMock.integration.create).mockResolvedValue({ id: 'int-1' } as any)

    const handler = await getCallbackHandler()
    const event: any = {
      query: { code: 'auth-code', state: 'oauth-state' },
      cookies: { oura_oauth_state: 'oauth-state' },
      deletedCookies: []
    }

    const res = await handler(event)

    expect(res.redirect).toContain('oura_success=true')
    expect(prismaMock.integration.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        provider: 'oura',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        externalUserId: 'oura-user-123',
        scope: OURA_SCOPE,
        syncStatus: 'SUCCESS',
        ingestWorkouts: true
      })
    })
    expect(prismaMock.integration.update).not.toHaveBeenCalled()
  })

  it('persists scope when updating an existing Oura integration', async () => {
    vi.mocked(prismaMock.integration.findFirst).mockResolvedValue({
      id: 'int-existing',
      userId: 'user-1',
      provider: 'oura'
    } as any)
    vi.mocked(prismaMock.integration.update).mockResolvedValue({ id: 'int-existing' } as any)

    const handler = await getCallbackHandler()
    const event: any = {
      query: { code: 'auth-code', state: 'oauth-state' },
      cookies: { oura_oauth_state: 'oauth-state' },
      deletedCookies: []
    }

    const res = await handler(event)

    expect(res.redirect).toContain('oura_success=true')
    expect(prismaMock.integration.update).toHaveBeenCalledWith({
      where: { id: 'int-existing' },
      data: expect.objectContaining({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        externalUserId: 'oura-user-123',
        scope: OURA_SCOPE,
        syncStatus: 'SUCCESS'
      })
    })
    expect(prismaMock.integration.create).not.toHaveBeenCalled()
  })
})
