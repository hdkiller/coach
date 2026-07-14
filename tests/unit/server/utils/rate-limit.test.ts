import { describe, expect, it } from 'vitest'
import { checkRateLimit } from '../../../../server/utils/rate-limit'

describe('rate-limit', () => {
  it('allows attempts within the configured window', () => {
    const namespace = `test-${Date.now()}-allow`
    const options = { windowMs: 60_000, maxAttempts: 3, minIntervalMs: 0 }

    expect(checkRateLimit(namespace, 'key', options, 1_000).allowed).toBe(true)
    expect(checkRateLimit(namespace, 'key', options, 2_000).allowed).toBe(true)
    expect(checkRateLimit(namespace, 'key', options, 3_000).allowed).toBe(true)
  })

  it('blocks attempts after the max is reached', () => {
    const namespace = `test-${Date.now()}-block`
    const options = { windowMs: 60_000, maxAttempts: 2, minIntervalMs: 0 }

    expect(checkRateLimit(namespace, 'key', options, 10_000).allowed).toBe(true)
    expect(checkRateLimit(namespace, 'key', options, 11_000).allowed).toBe(true)
    expect(checkRateLimit(namespace, 'key', options, 12_000).allowed).toBe(false)
  })
})
