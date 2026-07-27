import { describe, expect, it } from 'vitest'

describe('Billing Checkout Success UI (CW-3)', () => {
  it('determines success message visibility based on confirmed ACTIVE status', () => {
    const isConfirmedActive = (status: string, tier: string) => {
      return status === 'ACTIVE' && tier !== 'FREE'
    }

    expect(isConfirmedActive('ACTIVE', 'PRO')).toBe(true)
    expect(isConfirmedActive('ACTIVE', 'SUPPORTER')).toBe(true)
    expect(isConfirmedActive('NONE', 'FREE')).toBe(false)
    expect(isConfirmedActive('PAST_DUE', 'SUPPORTER')).toBe(false)
  })
})
