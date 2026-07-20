import { createHmac } from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateWsToken, verifyWsToken, wsAuthHasScopes } from '../../../../server/utils/ws-auth'

describe('ws-auth', () => {
  beforeEach(() => {
    vi.stubEnv('INTERNAL_API_TOKEN', 'test-ws-auth-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('generates tokens that verify on another logical instance', () => {
    const token = generateWsToken('user-123', ['chat:read', 'chat:write'])
    expect(verifyWsToken(token)).toEqual({
      userId: 'user-123',
      scopes: ['chat:read', 'chat:write']
    })
  })

  it('embeds null scopes for unrestricted session/API-key mints', () => {
    const token = generateWsToken('user-123', null)
    expect(verifyWsToken(token)).toEqual({
      userId: 'user-123',
      scopes: null
    })
  })

  it('rejects tampered tokens', () => {
    const token = generateWsToken('user-123')
    expect(verifyWsToken(`${token}x`)).toBeNull()
  })

  it('rejects expired tokens', () => {
    vi.useFakeTimers()
    const token = generateWsToken('user-123')
    vi.advanceTimersByTime(11_000)
    expect(verifyWsToken(token)).toBeNull()
    vi.useRealTimers()
  })

  it('rejects tokens signed with a different secret', () => {
    const token = generateWsToken('user-123')
    const [payloadB64] = token.split('.')
    const badSignature = createHmac('sha256', 'wrong-secret').update(payloadB64).digest('hex')
    expect(verifyWsToken(`${payloadB64}.${badSignature}`)).toBeNull()
  })

  it('treats legacy tokens without scopes as empty grants', () => {
    const secret = 'test-ws-auth-secret'
    const payload = {
      sub: 'user-123',
      purpose: 'websocket_auth',
      exp: Date.now() + 10_000,
      nonce: 'abc'
    }
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signature = createHmac('sha256', secret).update(payloadB64).digest('hex')
    expect(verifyWsToken(`${payloadB64}.${signature}`)).toEqual({
      userId: 'user-123',
      scopes: []
    })
  })

  it('wsAuthHasScopes treats null as unrestricted', () => {
    expect(wsAuthHasScopes(null, ['chat:write'])).toBe(true)
    expect(wsAuthHasScopes(['workout:read'], ['chat:write'])).toBe(false)
    expect(wsAuthHasScopes(['chat:write'], ['chat:write'])).toBe(true)
    expect(wsAuthHasScopes([], ['chat:write'])).toBe(false)
  })
})
