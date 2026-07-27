import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', vi.fn())
vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'https://coachwatts.com' } }))
vi.stubGlobal('getQuery', (event: any) => event.query || {})
vi.stubGlobal('getCookie', (event: any, key: string) => event.cookies?.[key])
vi.stubGlobal('setCookie', (event: any, key: string, value: string) => {
  event.setCookies = event.setCookies || {}
  event.setCookies[key] = value
})
vi.stubGlobal('deleteCookie', (event: any, key: string) => {
  event.deletedCookies = event.deletedCookies || []
  event.deletedCookies.push(key)
})
vi.stubGlobal('sendRedirect', (event: any, location: string) => ({ redirect: location }))
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ public: { siteUrl: 'https://coachwatts.com' } }),
  defineRouteMeta: vi.fn(),
  defineEventHandler: (fn: any) => fn,
  getQuery: (event: any) => event.query || {},
  getCookie: (event: any, key: string) => event.cookies?.[key],
  setCookie: (event: any, key: string, value: string) => {
    event.setCookies = event.setCookies || {}
    event.setCookies[key] = value
  },
  deleteCookie: (event: any, key: string) => {
    event.deletedCookies = event.deletedCookies || []
    event.deletedCookies.push(key)
  },
  sendRedirect: (event: any, location: string) => ({ redirect: location }),
  createError: (err: any) => {
    const error = new Error(err.message || err.statusMessage)
    ;(error as any).statusCode = err.statusCode
    return error
  }
}))

vi.mock('../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

vi.mock('../../../../../server/utils/pkce', () => ({
  generateCodeVerifier: () => 'test-verifier-12345678901234567890',
  generateCodeChallenge: () => 'test-challenge'
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    integration: {
      findFirst: vi.fn(),
      upsert: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/garmin', () => ({
  refreshGarminIntegrationPermissions: vi.fn()
}))

vi.mock('../../../../../server/utils/task-dispatcher', () => ({
  dispatchTask: vi.fn()
}))

const getAuthorizeHandler = async () => {
  const mod = await import('../../../../../server/api/integrations/garmin/authorize.get')
  return mod.default
}

const getCallbackHandler = async () => {
  const mod = await import('../../../../../server/api/integrations/garmin/callback.get')
  return mod.default
}

describe('Garmin OAuth State Binding (CW-98)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GARMIN_CLIENT_ID = 'test-client-id'
    process.env.GARMIN_CLIENT_SECRET = 'test-client-secret'
  })

  describe('GET /api/integrations/garmin/authorize', () => {
    it('sets garmin_oauth_state cookie and includes state in authUrl', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'athlete@example.com' }
      } as any)

      const handler = await getAuthorizeHandler()
      const event: any = { setCookies: {} }
      const res = await handler(event)

      expect(event.setCookies.garmin_code_verifier).toBe('test-verifier-12345678901234567890')
      expect(event.setCookies.garmin_oauth_state).toBeDefined()
      expect(event.setCookies.garmin_oauth_state).toHaveLength(64) // hex 32 bytes

      const url = new URL(res.redirect)
      expect(url.searchParams.get('state')).toBe(event.setCookies.garmin_oauth_state)
    })
  })

  describe('GET /api/integrations/garmin/callback', () => {
    it('redirects with state-mismatch error when state is missing or mismatched', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)

      const handler = await getCallbackHandler()
      const event: any = {
        query: { code: 'valid-code', state: 'invalid-state' },
        cookies: { garmin_code_verifier: 'verifier', garmin_oauth_state: 'correct-state' },
        deletedCookies: []
      }

      const res = await handler(event)

      expect(res.redirect).toContain('garmin_error=state-mismatch')
      expect(event.deletedCookies).toContain('garmin_code_verifier')
      expect(event.deletedCookies).toContain('garmin_oauth_state')
    })

    it('rejects missing state query parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)

      const handler = await getCallbackHandler()
      const event: any = {
        query: { code: 'valid-code' },
        cookies: { garmin_code_verifier: 'verifier', garmin_oauth_state: 'correct-state' },
        deletedCookies: []
      }

      const res = await handler(event)
      expect(res.redirect).toContain('garmin_error=state-mismatch')
    })
  })
})
