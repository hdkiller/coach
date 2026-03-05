import { describe, expect, it } from 'vitest'
import { normalizeTargetPolicy } from './workout-target-policy'

describe('normalizeTargetPolicy', () => {
  it('defaults strictPrimary to true when not provided', () => {
    const policy = normalizeTargetPolicy({}, 'POWER_HR_PACE')

    expect(policy.strictPrimary).toBe(true)
    expect(policy.primaryMetric).toBe('power')
    expect(policy.fallbackOrder[0]).toBe('power')
  })

  it('respects explicit strictPrimary false', () => {
    const policy = normalizeTargetPolicy(
      {
        strictPrimary: false,
        primaryMetric: 'heartRate',
        fallbackOrder: ['heartRate', 'pace', 'power']
      },
      'POWER_HR_PACE'
    )

    expect(policy.strictPrimary).toBe(false)
    expect(policy.primaryMetric).toBe('heartRate')
    expect(policy.fallbackOrder[0]).toBe('heartRate')
  })
})

