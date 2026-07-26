import { describe, expect, it } from 'vitest'
import {
  buildDayFuelingPlan,
  estimateDailyCarbTargetGrams,
  getSportFuelingClass,
  normalizeIntensity,
  resolveDayFuelState,
  SESSION_MERGE_GAP_MIN
} from '../../../../../server/utils/nutrition-domain/day-plan'
import type { FuelingProfile } from '../../../../../server/utils/nutrition-domain/types'

const DAY = new Date('2026-07-21T00:00:00.000Z')

const profile: FuelingProfile = {
  weight: 80,
  ftp: 250,
  currentCarbMax: 90,
  bmr: 1700,
  activityLevel: 'ACTIVE',
  baseCaloriesMode: 'AUTO',
  targetAdjustmentPercent: 0,
  baseProteinPerKg: 1.6,
  baseFatPerKg: 1.0,
  preWorkoutWindow: 90,
  postWorkoutWindow: 60,
  fuelingSensitivity: 1.0
}

const mealSlots = [
  { name: 'Breakfast', at: new Date('2026-07-21T06:00:00.000Z') },
  { name: 'Lunch', at: new Date('2026-07-21T11:00:00.000Z') },
  { name: 'Dinner', at: new Date('2026-07-21T18:00:00.000Z') }
]

function workout(overrides: Partial<any> = {}) {
  return {
    id: 'w1',
    title: 'Endurance Ride',
    durationSec: 3600,
    type: 'Ride',
    date: DAY,
    startTime: new Date('2026-07-21T08:00:00.000Z'),
    workIntensity: 0.75,
    ...overrides
  }
}

describe('normalizeIntensity', () => {
  it('clamps implausible intensity values', () => {
    expect(normalizeIntensity(workout({ workIntensity: 4 }))).toBeLessThanOrEqual(1.3)
    expect(normalizeIntensity(workout({ workIntensity: 0.01 }))).toBeGreaterThanOrEqual(0.3)
  })

  it('rejects the intensity implied by an impossible TSS-per-minute ratio', () => {
    // 31 TSS in 8 minutes implies IF ~1.5, which is not a real session.
    const intensity = normalizeIntensity(workout({ durationSec: 480, tss: 31, workIntensity: 1.5 }))
    expect(intensity).toBeLessThan(1.0)
  })

  it('falls back to a moderate default when intensity is missing', () => {
    const bare = { id: 'x', title: 'x', durationSec: 3600, date: DAY }
    expect(normalizeIntensity(bare)).toBeCloseTo(0.65)
  })
})

describe('getSportFuelingClass', () => {
  it('separates resistance and low intensity work from endurance', () => {
    expect(getSportFuelingClass('Ride')).toBe('ENDURANCE')
    expect(getSportFuelingClass('WeightTraining')).toBe('RESISTANCE')
    expect(getSportFuelingClass('Gym')).toBe('RESISTANCE')
    expect(getSportFuelingClass('Yoga')).toBe('LOW_INTENSITY')
    expect(getSportFuelingClass(undefined)).toBe('ENDURANCE')
  })
})

describe('resolveDayFuelState', () => {
  const normalize = (workouts: any[]) =>
    workouts.map((w) => ({
      ...w,
      durationHours: w.durationSec / 3600,
      normalizedIntensity: normalizeIntensity(w),
      sportClass: getSportFuelingClass(w.type),
      start: new Date(w.startTime),
      end: new Date(w.startTime)
    })) as any

  it('does not let one short hard effort drive the whole day to state 3', () => {
    const { state } = resolveDayFuelState(
      profile,
      normalize([
        workout({ id: 'a', durationSec: 1800, type: 'Run', workIntensity: 0.5 }),
        workout({ id: 'b', durationSec: 3600, type: 'Gym', workIntensity: 0.8 }),
        workout({ id: 'c', durationSec: 480, type: 'Gym', tss: 31, workIntensity: 1.5 })
      ])
    )

    expect(state).toBeLessThan(3)
  })

  it('promotes long endurance days on volume alone', () => {
    const { state } = resolveDayFuelState(
      profile,
      normalize([workout({ durationSec: 5 * 3600, workIntensity: 0.6 })])
    )

    expect(state).toBe(3)
  })

  it('uses state 3 for a genuinely hard endurance day', () => {
    const { state } = resolveDayFuelState(
      profile,
      normalize([workout({ durationSec: 2 * 3600, workIntensity: 0.95 })])
    )

    expect(state).toBe(3)
  })
})

describe('buildDayFuelingPlan', () => {
  it('emits one PRE and one POST for back-to-back sessions', () => {
    const plan = buildDayFuelingPlan(
      profile,
      [
        workout({ id: 'a', title: 'Warmup Run', durationSec: 1800, type: 'Run' }),
        workout({
          id: 'b',
          title: 'Strength',
          durationSec: 3600,
          type: 'Gym',
          startTime: new Date('2026-07-21T08:35:00.000Z')
        })
      ],
      { date: DAY, mealSlots }
    )

    const pre = plan.windows.filter((w) => w.type === 'PRE_WORKOUT')
    const post = plan.windows.filter((w) => w.type === 'POST_WORKOUT')

    expect(pre).toHaveLength(1)
    expect(post).toHaveLength(1)
    expect(pre[0]?.workoutTitle).toBe('Warmup Run & Strength')
  })

  it('splits sessions that are far apart into separate blocks', () => {
    const plan = buildDayFuelingPlan(
      profile,
      [
        workout({ id: 'a', title: 'Morning Ride' }),
        workout({
          id: 'b',
          title: 'Evening Ride',
          startTime: new Date('2026-07-21T17:00:00.000Z')
        })
      ],
      { date: DAY, mealSlots }
    )

    expect(plan.windows.filter((w) => w.type === 'PRE_WORKOUT')).toHaveLength(2)
    expect(plan.windows.filter((w) => w.type === 'POST_WORKOUT')).toHaveLength(2)
  })

  it('merges sessions separated by less than the block gap', () => {
    const gapMs = (SESSION_MERGE_GAP_MIN - 5) * 60000
    const firstEnd = new Date('2026-07-21T09:00:00.000Z')
    const plan = buildDayFuelingPlan(
      profile,
      [workout({ id: 'a' }), workout({ id: 'b', startTime: new Date(firstEnd.getTime() + gapMs) })],
      { date: DAY, mealSlots }
    )

    expect(plan.windows.filter((w) => w.type === 'PRE_WORKOUT')).toHaveLength(1)
  })

  it('omits intra-workout windows for short gym sessions', () => {
    const plan = buildDayFuelingPlan(
      profile,
      [workout({ title: 'Strength', durationSec: 2700, type: 'Gym', workIntensity: 0.8 })],
      { date: DAY, mealSlots }
    )

    expect(plan.windows.filter((w) => w.type === 'INTRA_WORKOUT')).toHaveLength(0)
  })

  it('still fuels long rides in-session', () => {
    const plan = buildDayFuelingPlan(
      profile,
      [workout({ durationSec: 3 * 3600, workIntensity: 0.75 })],
      { date: DAY, mealSlots }
    )

    const intra = plan.windows.filter((w) => w.type === 'INTRA_WORKOUT')
    expect(intra).toHaveLength(1)
    expect(intra[0]?.targetCarbs).toBeGreaterThan(100)
  })

  it('gives rest days baseline windows instead of none at all', () => {
    const plan = buildDayFuelingPlan(profile, [], { date: DAY, mealSlots })

    expect(plan.windows).toHaveLength(3)
    expect(plan.windows.every((w) => w.type === 'DAILY_BASE')).toBe(true)
    expect(plan.dailyTotals.fuelState).toBe(1)
  })

  it('reconciles window macros against the daily targets', () => {
    const plan = buildDayFuelingPlan(profile, [workout({ durationSec: 2 * 3600 })], {
      date: DAY,
      mealSlots
    })

    const carbs = plan.windows.reduce((sum, w) => sum + w.targetCarbs, 0)
    const protein = plan.windows.reduce((sum, w) => sum + w.targetProtein, 0)
    const fat = plan.windows.reduce((sum, w) => sum + w.targetFat, 0)

    expect(carbs).toBe(plan.dailyTotals.carbs)
    expect(protein).toBe(plan.dailyTotals.protein)
    expect(fat).toBe(plan.dailyTotals.fat)

    // Protein must land near the configured 1.6g/kg rather than accumulating per workout window.
    expect(protein).toBeGreaterThan(profile.weight * 1.5)
    expect(protein).toBeLessThan(profile.weight * 1.8)
  })

  it('leaves the baseline meals a real share of a training day', () => {
    const plan = buildDayFuelingPlan(profile, [workout({ durationSec: 2 * 3600 })], {
      date: DAY,
      mealSlots
    })

    const base = plan.windows.filter((w) => w.type === 'DAILY_BASE')
    const anchored = plan.windows.filter(
      (w) => w.type === 'PRE_WORKOUT' || w.type === 'POST_WORKOUT'
    )
    const baseCarbs = base.reduce((sum, w) => sum + w.targetCarbs, 0)
    const anchorCarbs = anchored.reduce((sum, w) => sum + w.targetCarbs, 0)

    expect(base.length).toBeGreaterThan(0)
    // Pre/post must not swallow the day and leave token amounts for breakfast and dinner.
    expect(baseCarbs).toBeGreaterThanOrEqual(anchorCarbs * 0.8)
    base.forEach((w) => expect(w.targetCarbs).toBeGreaterThan(20))
  })

  it('does not emit duplicate workout titles for a merged block', () => {
    const plan = buildDayFuelingPlan(
      profile,
      [
        workout({ id: 'a', title: 'Strength', type: 'Gym', durationSec: 1800 }),
        workout({
          id: 'b',
          title: 'Strength',
          type: 'Gym',
          durationSec: 1800,
          startTime: new Date('2026-07-21T08:40:00.000Z')
        })
      ],
      { date: DAY, mealSlots }
    )

    const pre = plan.windows.find((w) => w.type === 'PRE_WORKOUT')
    expect(pre?.workoutTitle).toBe('Strength')
  })

  it('never exceeds the per-sitting carb cap in an eating window', () => {
    const plan = buildDayFuelingPlan(profile, [workout({ durationSec: 5 * 3600 })], {
      date: DAY,
      mealSlots
    })

    const eating = plan.windows.filter((w) => w.type !== 'INTRA_WORKOUT')
    eating.forEach((w) => {
      expect(w.targetCarbs).toBeLessThanOrEqual(profile.weight * 2.0 + 1)
    })
  })

  it('assigns a stable, unique window key to every window', () => {
    const plan = buildDayFuelingPlan(
      profile,
      [
        workout({ id: 'a', title: 'Morning' }),
        workout({ id: 'b', title: 'Evening', startTime: new Date('2026-07-21T17:00:00.000Z') })
      ],
      { date: DAY, mealSlots }
    )

    const keys = plan.windows.map((w) => w.windowKey)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toContain('PRE_WORKOUT#1')
    expect(keys).toContain('PRE_WORKOUT#2')
    expect(keys).toContain('DAILY_BASE:breakfast')
  })

  it('derives kcal for every window from its macros', () => {
    const plan = buildDayFuelingPlan(profile, [workout()], { date: DAY, mealSlots })

    plan.windows.forEach((w) => {
      expect(w.targetKcal).toBe(w.targetCarbs * 4 + w.targetProtein * 4 + w.targetFat * 9)
    })
  })

  it('drops baseline slots that fall inside a workout window', () => {
    const plan = buildDayFuelingPlan(
      profile,
      [workout({ durationSec: 4 * 3600, startTime: new Date('2026-07-21T09:00:00.000Z') })],
      { date: DAY, mealSlots }
    )

    // The 11:00 lunch slot sits inside the ride, so the intra window covers it instead.
    const slotNames = plan.windows.filter((w) => w.type === 'DAILY_BASE').map((w) => w.slotName)
    expect(slotNames).not.toContain('Lunch')
    expect(slotNames).toContain('Dinner')
  })

  it('honours the TRAIN_LOW strategy override', () => {
    const plan = buildDayFuelingPlan(profile, [workout({ durationSec: 2 * 3600 })], {
      date: DAY,
      mealSlots,
      strategyOverride: 'TRAIN_LOW'
    })

    const intra = plan.windows.filter((w) => w.type === 'INTRA_WORKOUT')
    expect(intra.every((w) => w.targetCarbs === 0)).toBe(true)
  })

  it('applies a remediation carb adjustment', () => {
    const normal = buildDayFuelingPlan(profile, [workout({ durationSec: 2 * 3600 })], {
      date: DAY,
      mealSlots
    })
    const reduced = buildDayFuelingPlan(profile, [workout({ durationSec: 2 * 3600 })], {
      date: DAY,
      mealSlots,
      carbAdjustment: 0.5
    })

    expect(reduced.dailyTotals.carbs).toBeLessThan(normal.dailyTotals.carbs)
  })
})

describe('daily base window keys', () => {
  // NutritionPlanMeal is unique on (planId, date, windowType), so a repeated key makes a lock on
  // one slot silently overwrite the other. Two production users already have a duplicated 'Snack'.
  it('gives duplicate slot names distinct window keys', () => {
    const plan = buildDayFuelingPlan(profile, [], {
      date: DAY,
      mealSlots: [
        { name: 'Lunch', at: new Date('2026-07-21T11:00:00.000Z') },
        { name: 'Lunch', at: new Date('2026-07-21T15:00:00.000Z') },
        { name: 'Dinner', at: new Date('2026-07-21T18:00:00.000Z') }
      ]
    })

    const keys = plan.windows.map((w) => w.windowKey)
    expect(keys).toEqual(['DAILY_BASE:lunch', 'DAILY_BASE:lunch#2', 'DAILY_BASE:dinner'])
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('treats names that differ only in punctuation as duplicates', () => {
    const plan = buildDayFuelingPlan(profile, [], {
      date: DAY,
      mealSlots: [
        { name: 'Post ride', at: new Date('2026-07-21T11:00:00.000Z') },
        { name: 'post-ride!', at: new Date('2026-07-21T15:00:00.000Z') }
      ]
    })

    expect(plan.windows.map((w) => w.windowKey)).toEqual([
      'DAILY_BASE:post-ride',
      'DAILY_BASE:post-ride#2'
    ])
  })

  it('keeps a usable key for a name with no alphanumeric characters', () => {
    const plan = buildDayFuelingPlan(profile, [], {
      date: DAY,
      mealSlots: [{ name: '☕️', at: new Date('2026-07-21T11:00:00.000Z') }]
    })

    // 'DAILY_BASE:' - the old result - is not a key anything can be matched against.
    expect(plan.windows[0]?.windowKey).toBe('DAILY_BASE:slot')
  })

  it('keeps slot keys stable when a workout swallows an earlier slot', () => {
    // A slot's identity has to come from the meal pattern alone. If keys were assigned after the
    // overlap filter, a morning workout would silently promote the second 'Snack' to the first's
    // key and re-point any meal locked against it.
    const slots = [
      { name: 'Snack', at: new Date('2026-07-21T08:15:00.000Z') },
      { name: 'Snack', at: new Date('2026-07-21T15:00:00.000Z') }
    ]

    const restDay = buildDayFuelingPlan(profile, [], { date: DAY, mealSlots: slots })
    const rideDay = buildDayFuelingPlan(profile, [workout()], { date: DAY, mealSlots: slots })

    const afternoonKey = (plan: typeof restDay) =>
      plan.windows.find((w) => w.startTime === '2026-07-21T15:00:00.000Z')?.windowKey

    expect(rideDay.windows.filter((w) => w.type === 'DAILY_BASE')).toHaveLength(1)
    expect(afternoonKey(rideDay)).toBe(afternoonKey(restDay))
    expect(afternoonKey(rideDay)).toBe('DAILY_BASE:snack#2')
  })
})

describe('estimateDailyCarbTargetGrams', () => {
  it('matches the target the full builder produces', () => {
    const workouts = [workout({ durationSec: 2 * 3600, workIntensity: 0.9 })]
    const plan = buildDayFuelingPlan(profile, workouts, { date: DAY, mealSlots })

    expect(estimateDailyCarbTargetGrams(profile, workouts, { date: DAY })).toBe(
      plan.dailyTotals.carbs
    )
  })

  it('scales a hard day well above the lowest fuel state minimum', () => {
    // The energy projection used to fall back on fuelState1Min for any day without a saved plan.
    const floor = profile.weight * (profile.fuelState1Min ?? 2.5)
    const hardDay = estimateDailyCarbTargetGrams(
      profile,
      [workout({ durationSec: 4 * 3600, workIntensity: 0.85 })],
      { date: DAY }
    )

    expect(hardDay).toBeGreaterThan(floor * 1.5)
  })

  it('returns the rest-day target when nothing is scheduled', () => {
    const rest = buildDayFuelingPlan(profile, [], { date: DAY, mealSlots })
    expect(estimateDailyCarbTargetGrams(profile, [], { date: DAY })).toBe(rest.dailyTotals.carbs)
  })

  it('applies a remediation carb adjustment', () => {
    const base = estimateDailyCarbTargetGrams(profile, [], { date: DAY })
    const boosted = estimateDailyCarbTargetGrams(profile, [], { date: DAY, carbAdjustment: 1.25 })

    expect(boosted).toBeGreaterThan(base)
    expect(boosted).toBe(Math.round(base * 1.25))
  })
})
