import { afterEach, describe, expect, it } from 'vitest'
import { isValidIntervalsWebhookSecret } from '../../../../server/utils/intervals-webhook-auth'

describe('Intervals webhook authentication', () => {
  const originalSecret = process.env.INTERVALS_WEBHOOK_SECRET

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.INTERVALS_WEBHOOK_SECRET
    else process.env.INTERVALS_WEBHOOK_SECRET = originalSecret
  })

  it('fails closed when the server secret is not configured', () => {
    delete process.env.INTERVALS_WEBHOOK_SECRET
    expect(isValidIntervalsWebhookSecret(undefined)).toBe(false)
    expect(isValidIntervalsWebhookSecret('')).toBe(false)
  })

  it('accepts only an exact configured secret', () => {
    process.env.INTERVALS_WEBHOOK_SECRET = 'configured-secret'
    expect(isValidIntervalsWebhookSecret('configured-secret')).toBe(true)
    expect(isValidIntervalsWebhookSecret('configured-secret-x')).toBe(false)
    expect(isValidIntervalsWebhookSecret('wrong-secret')).toBe(false)
  })
})
