import { describe, expect, it } from 'vitest'
import {
  getHydrationAdviceLevel,
  getHydrationAdviceSummary,
  HYDRATION_DEBT_NUDGE_THRESHOLD_ML
} from '../../../../../server/utils/nutrition/hydration'

describe('hydration advice', () => {
  it('maps higher debt to more urgent advice tiers', () => {
    expect(getHydrationAdviceLevel(2500)).toBe('severe')
    expect(getHydrationAdviceLevel(1600)).toBe('high')
    expect(getHydrationAdviceLevel(800)).toBe('moderate')
    expect(getHydrationAdviceLevel(200)).toBe('optimal')
  })

  it('gives stronger summary text to higher debt than mid-range debt', () => {
    const severeSummary = getHydrationAdviceSummary(2500)
    const highSummary = getHydrationAdviceSummary(1600)

    expect(severeSummary).toContain('WARNING')
    expect(highSummary).toContain('Add 500ml')
    expect(severeSummary).not.toEqual(highSummary)
  })

  it('uses the nudge threshold as the severe cutoff', () => {
    expect(getHydrationAdviceLevel(HYDRATION_DEBT_NUDGE_THRESHOLD_ML + 1)).toBe('severe')
    expect(getHydrationAdviceLevel(HYDRATION_DEBT_NUDGE_THRESHOLD_ML)).toBe('high')
  })
})
