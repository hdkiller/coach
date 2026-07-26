import { describe, expect, it } from 'vitest'
import {
  calculateEnergyTimeline,
  carryForwardGlycogen,
  getGramsPerMin,
  resolveGlycogenCapacityG,
  GLYCOGEN_SHARE_OF_RESTING_ENERGY,
  RESTING_ACTIVITY_FACTOR
} from '../../../../../server/utils/nutrition-domain/metabolic-simulation'

describe('getGramsPerMin', () => {
  it('carries each old band rate at its midpoint', () => {
    // Anchors are the old band values times the 1.25 uplift that used to be applied separately.
    expect(getGramsPerMin(0.5)).toBeCloseTo(0.94, 6)
    expect(getGramsPerMin(0.675)).toBeCloseTo(1.88, 6)
    expect(getGramsPerMin(0.825)).toBeCloseTo(3.44, 6)
  })

  it('holds the top anchor below the oxidisable ceiling', () => {
    // The old effective rate at maximal intensity was 5.6 g/min, beyond measured whole-body
    // carbohydrate oxidation. 4.5 sits at the ceiling rather than past it.
    expect(getGramsPerMin(0.95)).toBeCloseTo(4.5, 6)
    expect(getGramsPerMin(1.1)).toBeLessThanOrEqual(4.5)
  })

  it('is flat outside the anchored range', () => {
    expect(getGramsPerMin(0.2)).toBeCloseTo(0.94, 6)
    expect(getGramsPerMin(0)).toBeCloseTo(0.94, 6)
    expect(getGramsPerMin(1.2)).toBeCloseTo(4.5, 6)
  })

  it('cannot drain more than an athlete can hold in a long steady session', () => {
    // A five hour endurance ride must not cost more glycogen than the tank holds. Collapsing the
    // bands to three anchors once made this case drain 670g against a 640g capacity.
    const fiveHoursAtEndurance = getGramsPerMin(0.68, 'ENDURANCE') * 300
    expect(fiveHoursAtEndurance).toBeLessThan(640)
  })

  it('has no cliff at the old band edges', () => {
    // The step function jumped from 2.75 to 4.5 across a hundredth of a point at 0.9.
    const just_below = getGramsPerMin(0.899)
    const just_above = getGramsPerMin(0.901)
    expect(Math.abs(just_above - just_below)).toBeLessThan(0.05)

    const below_075 = getGramsPerMin(0.749)
    const above_075 = getGramsPerMin(0.751)
    expect(Math.abs(above_075 - below_075)).toBeLessThan(0.05)
  })

  it('rises monotonically with intensity', () => {
    let previous = 0
    for (let i = 0; i <= 1.3; i += 0.01) {
      const value = getGramsPerMin(i)
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9)
      previous = value
    }
  })

  it('charges resistance and low-intensity work less than endurance', () => {
    const endurance = getGramsPerMin(0.8, 'ENDURANCE')
    const resistance = getGramsPerMin(0.8, 'RESISTANCE')
    const easy = getGramsPerMin(0.8, 'LOW_INTENSITY')

    expect(resistance).toBeLessThan(endurance)
    expect(easy).toBeLessThan(resistance)
  })

  it('defaults to endurance when the sport is unknown', () => {
    expect(getGramsPerMin(0.8)).toBe(getGramsPerMin(0.8, 'ENDURANCE'))
  })

  it('handles a nonsense intensity without producing NaN', () => {
    expect(Number.isFinite(getGramsPerMin(NaN))).toBe(true)
    expect(Number.isFinite(getGramsPerMin(Infinity))).toBe(true)
  })
})

describe('resting drain', () => {
  const settings = {
    weight: 80,
    bmr: 1700,
    metabolicFloor: 0.6,
    fuelState1Min: 2.5,
    mealPattern: [{ name: 'Breakfast', time: '07:00' }]
  }

  it('reproduces the previous figure exactly after the refactor', () => {
    // Both drains now come off BMR x 1.2; the glycogen share was chosen so the grams are unchanged
    // from the old "40% of bare BMR". If either constant moves, this is the tripwire.
    const dailyBmr = settings.bmr
    const perDayGrams = (dailyBmr * RESTING_ACTIVITY_FACTOR * GLYCOGEN_SHARE_OF_RESTING_ENERGY) / 4

    expect(perDayGrams).toBeCloseTo((dailyBmr * 0.4) / 4, 9)
  })

  it('drains a rest day at the previous rate', () => {
    const points = calculateEnergyTimeline(
      { date: '2026-07-22', carbsGoal: 0 },
      [],
      settings,
      'UTC',
      undefined,
      {
        startingGlycogenPercentage: 100,
        startingFluidDeficit: 0,
        now: new Date('2026-07-22T23:59:00Z')
      }
    )

    const drained = points[0]!.carbBalance - points[points.length - 1]!.carbBalance
    // 1700 kcal x 0.4 / 4 kcal per gram = 170g across the day.
    expect(drained).toBeCloseTo(170, 0)
  })
})

describe('resolveGlycogenCapacityG', () => {
  it('uses lean mass when body composition is known', () => {
    // 80kg at 15% fat is 68kg lean.
    expect(resolveGlycogenCapacityG({ weight: 80, bodyFatPercent: 15 })).toBeCloseTo(68 * 9, 6)
  })

  it('prefers an explicit lean mass over a derived one', () => {
    expect(
      resolveGlycogenCapacityG({ weight: 80, bodyFatPercent: 15, leanMassKg: 70 })
    ).toBeCloseTo(70 * 9, 6)
  })

  it('keeps the bodyweight basis when body composition is unknown', () => {
    // Athletes who have never logged body fat must see no change.
    expect(resolveGlycogenCapacityG({ weight: 80 })).toBe(640)
    expect(resolveGlycogenCapacityG({ weight: 80, bodyFatPercent: null })).toBe(640)
    expect(resolveGlycogenCapacityG({ weight: 80, bodyFatPercent: 0 })).toBe(640)
  })

  it('stops crediting a heavier, less lean athlete with muscle they do not have', () => {
    const onBodyweight = resolveGlycogenCapacityG({ weight: 100 })
    const onLeanMass = resolveGlycogenCapacityG({ weight: 100, bodyFatPercent: 30 })

    expect(onBodyweight).toBe(800)
    expect(onLeanMass).toBeLessThan(onBodyweight)
  })

  it('ignores an implausible body fat reading', () => {
    expect(resolveGlycogenCapacityG({ weight: 80, bodyFatPercent: 95 })).toBe(640)
    expect(resolveGlycogenCapacityG({ weight: 80, bodyFatPercent: -5 })).toBe(640)
  })

  it('never returns a capacity that would divide by zero', () => {
    expect(resolveGlycogenCapacityG({ weight: 0 })).toBeGreaterThanOrEqual(100)
    expect(resolveGlycogenCapacityG({})).toBeGreaterThan(0)
  })
})

describe('carryForwardGlycogen', () => {
  it('trusts a logged day exactly, including an honest zero', () => {
    expect(carryForwardGlycogen(0, true, 0.6)).toBe(0)
    expect(carryForwardGlycogen(42, true, 0.6)).toBe(42)
  })

  it('will not carry an unmeasured deficit forward', () => {
    // Without this, a run of unlogged days leaves the athlete permanently empty however well they
    // actually ate: the simulation drains a day with nothing going in and hands that on as fact.
    expect(carryForwardGlycogen(0, false, 0.6)).toBe(60)
    expect(carryForwardGlycogen(15, false, 0.6)).toBe(60)
  })

  it('leaves an unlogged day alone when it ended above the floor', () => {
    expect(carryForwardGlycogen(80, false, 0.6)).toBe(80)
  })

  it('falls back to a sensible floor when none is configured', () => {
    expect(carryForwardGlycogen(0, false, null)).toBe(60)
    expect(carryForwardGlycogen(0, false, undefined)).toBe(60)
  })

  it('survives a nonsense ending level', () => {
    expect(Number.isFinite(carryForwardGlycogen(NaN, true, 0.6))).toBe(true)
  })
})

describe('starting glycogen', () => {
  const settings = {
    weight: 80,
    bmr: 1700,
    metabolicFloor: 0.6,
    fuelState1Min: 2.5,
    mealPattern: [{ name: 'Breakfast', time: '07:00' }]
  }

  const startAt = (startingGlycogenPercentage: number | undefined) =>
    calculateEnergyTimeline({ date: '2026-07-22', carbsGoal: 0 }, [], settings, 'UTC', undefined, {
      startingGlycogenPercentage,
      startingFluidDeficit: 0,
      now: new Date('2026-07-22T23:59:00Z')
    })[0]!.level

  it('respects a known empty start rather than refilling the tank overnight', () => {
    // The old "safety floor" forced any start at or below zero up to 60%, inventing most of a tank
    // between midnight and one minute past, and putting a 60 point step in a continuous line.
    expect(startAt(0)).toBe(0)
  })

  it('still applies the floor when the chain supplies nothing', () => {
    expect(startAt(undefined)).toBe(60)
  })

  it('passes a known level through untouched', () => {
    expect(startAt(45)).toBe(45)
  })
})
