import { createHmac } from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateWsToken, verifyWsToken } from '../../../server/utils/ws-auth'

describe('ws-auth', () => {
  beforeEach(() => {
    vi.stubEnv('INTERNAL_API_TOKEN', 'test-ws-auth-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('generates tokens that verify on another logical instance', () => {
    const token = generateWsToken('user-123')
    expect(verifyWsToken(token)).toBe('user-123')
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
})
