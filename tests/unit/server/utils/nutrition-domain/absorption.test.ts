import { describe, expect, it } from 'vitest'
import {
  ABSORPTION_PROFILES,
  getAbsorbedFraction,
  getAbsorbedInInterval,
  getRa,
  getProfileForItem
} from '../../../../../server/utils/nutrition-domain/absorption'

const PROFILES = Object.values(ABSORPTION_PROFILES)

describe('getAbsorbedFraction', () => {
  it('absorbs nothing during the delay', () => {
    for (const profile of PROFILES) {
      expect(getAbsorbedFraction(profile.delay, profile)).toBe(0)
      expect(getAbsorbedFraction(profile.delay - 1, profile)).toBe(0)
      expect(getAbsorbedFraction(0, profile)).toBe(0)
    }
  })

  it('never exceeds the whole meal and rises monotonically', () => {
    for (const profile of PROFILES) {
      let previous = 0
      for (let mins = 0; mins <= 900; mins += 5) {
        const fraction = getAbsorbedFraction(mins, profile)
        expect(fraction).toBeGreaterThanOrEqual(previous)
        expect(fraction).toBeLessThanOrEqual(1)
        previous = fraction
      }
    }
  })

  it('approaches complete absorption given enough time', () => {
    for (const profile of PROFILES) {
      expect(getAbsorbedFraction(profile.duration * 4, profile)).toBeGreaterThan(0.98)
    }
  })

  it('has absorbed most of the meal by its stated duration', () => {
    for (const profile of PROFILES) {
      const atDuration = getAbsorbedFraction(profile.duration, profile)
      expect(atDuration).toBeGreaterThan(0.7)
      expect(atDuration).toBeLessThan(1)
    }
  })

  it('absorbs faster for rapid profiles than dense ones', () => {
    const rapid = getAbsorbedFraction(60, ABSORPTION_PROFILES.RAPID)
    const balanced = getAbsorbedFraction(60, ABSORPTION_PROFILES.BALANCED)
    const dense = getAbsorbedFraction(60, ABSORPTION_PROFILES.DENSE)

    expect(rapid).toBeGreaterThan(balanced)
    expect(balanced).toBeGreaterThan(dense)
  })
})

describe('getAbsorbedInInterval', () => {
  const profile = ABSORPTION_PROFILES.BALANCED

  it('never reports absorbing more than was eaten', () => {
    // The midpoint approximation this replaced peaked above the meal size and then decayed:
    // a 60g meal reported 92g at three hours and 4g at ten.
    for (const mins of [45, 90, 120, 180, 240, 360, 600]) {
      const absorbed = getAbsorbedInInterval(0, mins, 60, profile)
      expect(absorbed).toBeGreaterThanOrEqual(0)
      expect(absorbed).toBeLessThanOrEqual(60)
    }
  })

  it('is monotonic in elapsed time', () => {
    let previous = 0
    for (let mins = 0; mins <= 600; mins += 15) {
      const absorbed = getAbsorbedInInterval(0, mins, 60, profile)
      expect(absorbed).toBeGreaterThanOrEqual(previous)
      previous = absorbed
    }
    expect(previous).toBeGreaterThan(59)
  })

  it('sums across steps to the same total as one long span', () => {
    // Callers step in 5 and 15 minute intervals; both must agree with the closed form.
    for (const step of [5, 15]) {
      let stepped = 0
      for (let t = 0; t < 480; t += step) {
        stepped += getAbsorbedInInterval(t, t + step, 60, profile)
      }
      expect(stepped).toBeCloseTo(getAbsorbedInInterval(0, 480, 60, profile), 6)
    }
  })

  it('handles an interval straddling the delay without over-counting', () => {
    const rapid = ABSORPTION_PROFILES.RAPID // delay 5, so a 15 minute step straddles it
    const straddling = getAbsorbedInInterval(0, 15, 50, rapid)
    const afterDelayOnly = getAbsorbedInInterval(rapid.delay, 15, 50, rapid)

    expect(straddling).toBeCloseTo(afterDelayOnly, 6)
  })

  it('returns nothing for degenerate inputs', () => {
    expect(getAbsorbedInInterval(60, 30, 50, profile)).toBe(0)
    expect(getAbsorbedInInterval(0, 60, 0, profile)).toBe(0)
    expect(getAbsorbedInInterval(0, 60, -10, profile)).toBe(0)
  })
})

describe('getRa', () => {
  it('peaks at the profile peak, measured from the end of the delay', () => {
    for (const profile of PROFILES) {
      const atPeak = getRa(profile.delay + profile.peak, 60, profile)
      expect(atPeak).toBeGreaterThan(getRa(profile.delay + profile.peak - 10, 60, profile))
      expect(atPeak).toBeGreaterThan(getRa(profile.delay + profile.peak + 10, 60, profile))
    }
  })

  it('integrates to the meal size, matching the cumulative form', () => {
    const profile = ABSORPTION_PROFILES.FAST
    const step = 0.5
    let integral = 0
    for (let t = 0; t < 1200; t += step) {
      integral += getRa(t + step / 2, 60, profile) * step
    }

    expect(integral).toBeCloseTo(60, 1)
  })
})

describe("getProfileForItem", () => {
  it("resolves stored absorptionType first", () => {
    expect(getProfileForItem("Banana", "RAPID")).toBe(ABSORPTION_PROFILES.RAPID)
    expect(getProfileForItem("Oats", "dense")).toBe(ABSORPTION_PROFILES.DENSE)
  })

  it("falls back to BALANCED when absorptionType is missing or invalid", () => {
    expect(getProfileForItem("Oats")).toBe(ABSORPTION_PROFILES.BALANCED)
    expect(getProfileForItem("Oats", "INVALID_TYPE")).toBe(ABSORPTION_PROFILES.BALANCED)
  })
})
