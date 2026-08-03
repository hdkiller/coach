import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', vi.fn())
vi.stubGlobal('getHeader', (event: any, name: string) => {
  const headers = event?.headers || event?.node?.req?.headers || {}
  return headers[name] || headers[name.toLowerCase()]
})
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  // @ts-expect-error test helper property
  error.statusCode = err.statusCode
  return error
})

const getAccessToken = vi.fn()
const oAuthTokenUpdate = vi.fn().mockResolvedValue({})

vi.mock('../../../../../server/utils/repositories/oauthRepository', () => ({
  oauthRepository: {
    getAccessToken: (...args: unknown[]) => getAccessToken(...args)
  }
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    oAuthToken: {
      update: (...args: unknown[]) => oAuthTokenUpdate(...args)
    }
  }
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/oauth/userinfo.get')
  return mod.default
}

describe('GET /api/oauth/userinfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a pre-existing bearer token after account deactivation with 403', async () => {
    getAccessToken.mockResolvedValue({
      id: 'token-1',
      scopes: ['profile:read'],
      accessTokenExpiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-1',
        name: 'Deactivated User',
        email: 'deactivated@example.com',
        image: null,
        ftp: 250,
        weight: 70,
        deactivatedAt: new Date('2026-07-01T00:00:00.000Z')
      }
    })

    const handler = await getHandler()

    await expect(
      handler({
        headers: { Authorization: 'Bearer stale-access-token' },
        node: { req: { socket: { remoteAddress: '127.0.0.1' } } }
      } as any)
    ).rejects.toMatchObject({
      message: 'Account deactivated',
      statusCode: 403
    })

    expect(oAuthTokenUpdate).not.toHaveBeenCalled()
  })

  it('returns profile fields for an active user bearer token', async () => {
    getAccessToken.mockResolvedValue({
      id: 'token-1',
      scopes: ['openid'],
      accessTokenExpiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-1',
        name: 'Active User',
        email: 'active@example.com',
        image: null,
        deactivatedAt: null
      }
    })

    const handler = await getHandler()
    const result = await handler({
      headers: { Authorization: 'Bearer active-access-token' },
      node: { req: { socket: { remoteAddress: '127.0.0.1' } } }
    } as any)

    expect(result).toMatchObject({
      sub: 'user-1',
      name: 'Active User',
      email: 'active@example.com'
    })
    expect(oAuthTokenUpdate).toHaveBeenCalled()
  })

  it('rejects missing Authorization header with 401', async () => {
    const handler = await getHandler()

    await expect(handler({ headers: {} } as any)).rejects.toMatchObject({
      message: 'Missing or invalid Authorization header',
      statusCode: 401
    })
  })
})
