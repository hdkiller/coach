import { describe, expect, it } from 'vitest'
import {
  formatSteadyTargetStyleInstruction,
  normalizeTargetPolicy
} from '../../../../server/utils/workout-target-policy'

describe('workout target policy', () => {
  it('keeps explicit value style ahead of preferRangesForSteady', () => {
    const policy = normalizeTargetPolicy({
      primaryMetric: 'power',
      defaultTargetStyle: 'value',
      preferRangesForSteady: true
    })

    expect(formatSteadyTargetStyleInstruction(policy)).toContain('Prefer single-value targets')
    expect(formatSteadyTargetStyleInstruction(policy)).not.toContain('Prefer ranges')
  })
})
