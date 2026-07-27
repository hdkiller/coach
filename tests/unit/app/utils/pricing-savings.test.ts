import { describe, expect, it } from 'vitest'

import { PRICING_PLANS, calculateAnnualSavings, computeSavingsPercent } from '../../../../app/utils/pricing'

describe('computeSavingsPercent', () => {
  it('reports the real saving between a monthly and an annual price', () => {
    // Supporter: 8.99 x 12 = 107.88 against 89.99
    expect(computeSavingsPercent(8.99, 89.99)).toBe(17)
    // Pro: 14.99 x 12 = 179.88 against 119.00
    expect(computeSavingsPercent(14.99, 119)).toBe(34)
  })

  it('claims nothing when there is no saving to claim', () => {
    expect(computeSavingsPercent(10, 120)).toBeNull() // identical rate
    expect(computeSavingsPercent(10, 130)).toBeNull() // annual costs more
    expect(computeSavingsPercent(null, 89.99)).toBeNull()
    expect(computeSavingsPercent(8.99, null)).toBeNull()
    expect(computeSavingsPercent(0, 89.99)).toBeNull()
  })

  it('never returns the flat 33% the toggle used to hardcode', () => {
    const savings = PRICING_PLANS.filter((plan) => plan.annualPrice).map((plan) =>
      computeSavingsPercent(plan.monthlyPrice, plan.annualPrice)
    )
    expect(savings).toEqual([17, 34])
    expect(savings).not.toContain(33)
  })

  it('agrees with the per-plan helper the cards already used', () => {
    for (const plan of PRICING_PLANS) {
      if (!plan.annualPrice) continue
      expect(computeSavingsPercent(plan.monthlyPrice, plan.annualPrice)).toBe(
        calculateAnnualSavings(plan)
      )
    }
  })
})
