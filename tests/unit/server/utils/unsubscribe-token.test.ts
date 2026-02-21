import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken
} from '../../../../server/utils/unsubscribe-token'

describe('unsubscribe-token', () => {
  beforeEach(() => {
    process.env.NUXT_AUTH_SECRET = 'test-secret'
    delete process.env.EMAIL_UNSUBSCRIBE_TOKEN_TTL_SECONDS
  })

  it('generates and verifies a valid token', () => {
    const token = generateUnsubscribeToken('user-123')
    const verified = verifyUnsubscribeToken(token)
    expect(verified).toBe('user-123')
  })

  it('rejects expired tokens', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-21T10:00:00.000Z'))

    process.env.EMAIL_UNSUBSCRIBE_TOKEN_TTL_SECONDS = '300'
    const token = generateUnsubscribeToken('user-123')

    vi.setSystemTime(new Date('2026-02-21T10:10:01.000Z'))
    expect(verifyUnsubscribeToken(token)).toBeNull()

    vi.useRealTimers()
  })
})
