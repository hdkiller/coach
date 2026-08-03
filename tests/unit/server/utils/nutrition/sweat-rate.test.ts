import { describe, expect, it } from 'vitest'
import {
  SWEAT_RATE_LOOKUP_TABLE,
  getEstimatedSweatRateLph
} from '../../../../../server/utils/nutrition/sweat-rate'

describe('sweat rate temperature bands', () => {
  it('has no gap between consecutive bands', () => {
    const sorted = [...SWEAT_RATE_LOOKUP_TABLE].sort(
      (a, b) => a.temperatureMinC - b.temperatureMinC
    )
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.temperatureMinC).toBe(sorted[i - 1]!.temperatureMaxC)
    }
  })

  it('never falls through to a fixed fallback band for a value inside a gap', () => {
    // 9.95 sat strictly between the old bands' edges (9.9 and 10), so `find` returned nothing and
    // the lookup silently fell back to the "warm" (18-25.9) band regardless of the real temperature.
    const cold = getEstimatedSweatRateLph({ intensity: 0.9, temperatureC: 9.95 })
    const warm = getEstimatedSweatRateLph({ intensity: 0.9, temperatureC: 20 })

    expect(cold).not.toBe(warm)
    // 9.95 belongs to the coldest band (-20 to 10), whose "high" rate is 0.75 l/h.
    expect(cold).toBeCloseTo(0.75, 6)
  })

  it('assigns every half-degree from -20 to 60 to exactly one band', () => {
    for (let t = -20; t <= 60; t += 0.5) {
      const matches = SWEAT_RATE_LOOKUP_TABLE.filter(
        (band) => t >= band.temperatureMinC && t < band.temperatureMaxC
      )
      // 60 itself sits at the closed top edge, outside every half-open band; everything else must
      // match exactly one.
      if (t < 60) {
        expect(matches.length).toBe(1)
      } else {
        expect(matches.length).toBe(0)
      }
    }
  })

  it('keeps the boundary values themselves anchored to the warmer band (half-open [min, max))', () => {
    expect(getEstimatedSweatRateLph({ intensity: 0.9, temperatureC: 10 })).toBeCloseTo(0.95, 6)
    expect(getEstimatedSweatRateLph({ intensity: 0.9, temperatureC: 18 })).toBeCloseTo(1.2, 6)
    expect(getEstimatedSweatRateLph({ intensity: 0.9, temperatureC: 26 })).toBeCloseTo(1.45, 6)
  })

  it('clamps out-of-table temperatures to the nearest band instead of a fixed default', () => {
    const belowRange = getEstimatedSweatRateLph({ intensity: 0.9, temperatureC: -40 })
    const coldestBandHigh = 0.75
    expect(belowRange).toBeCloseTo(coldestBandHigh, 6)

    const aboveRange = getEstimatedSweatRateLph({ intensity: 0.9, temperatureC: 80 })
    const warmestBandHigh = 1.45
    expect(aboveRange).toBeCloseTo(warmestBandHigh, 6)
  })
})
