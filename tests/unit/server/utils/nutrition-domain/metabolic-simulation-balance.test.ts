import { describe, expect, it } from 'vitest'
import {
  calculateEnergyTimeline,
  INTERVAL_CARB_ABSORPTION_CAP_G,
  WORKOUT_DRAIN_MULTIPLIER
} from '../../../../../server/utils/nutrition-domain/metabolic-simulation'

const TIMEZONE = 'UTC'
const DATE = '2026-07-22'

const settings = {
  weight: 80,
  bmr: 1700,
  metabolicFloor: 0.6,
  fuelState1Min: 2.5,
  mealPattern: [
    { name: 'Breakfast', time: '07:00' },
    { name: 'Lunch', time: '12:00' },
    { name: 'Dinner', time: '19:00' }
  ]
}

function timeline(
  record: any,
  workouts: any[] = [],
  options: any = {},
  settingsOverride: any = {}
) {
  return calculateEnergyTimeline(
    { date: DATE, carbsGoal: 500, ...record },
    workouts,
    { ...settings, ...settingsOverride },
    TIMEZONE,
    undefined,
    {
      startingGlycogenPercentage: 80,
      startingFluidDeficit: 0,
      now: new Date(`${DATE}T23:59:00Z`),
      ...options
    }
  )
}

describe('energy timeline carbohydrate and calorie balance', () => {
  it('holds back calories for carbohydrate the gut could not absorb', () => {
    // Resting drain is switched off so the balances are pure intake, and the meal is far larger
    // than one interval can absorb so the cap has to bite.
    const huge = timeline(
      {
        breakfast: [
          {
            name: 'Huge Meal',
            carbs: 400,
            calories: 1600,
            logged_at: `${DATE}T07:00:00Z`,
            absorptionType: 'RAPID'
          }
        ]
      },
      [],
      {},
      // Note: `bmr: 0` would fall through `settings?.bmr || 1600`, so use a negligible value.
      { bmr: 1 }
    )

    const last = huge[huge.length - 1]!
    const carbsIn = last.carbBalance
    const kcalIn = last.kcalBalance

    expect(carbsIn).toBeGreaterThan(0)
    expect(carbsIn).toBeLessThan(400) // the cap withheld some of it

    // The meal is 4 kcal per gram. Calories must be credited only for carbohydrate that was
    // actually taken up: before, the cap limited grams while the full calorie load went through,
    // which pushed this ratio far above 4.
    const kcalPerGram = kcalIn / carbsIn
    expect(kcalPerGram).toBeGreaterThan(3.5)
    expect(kcalPerGram).toBeLessThan(4.5)
  })

  it('caps absorption per interval', () => {
    const points = timeline({
      breakfast: [
        {
          name: 'Huge Meal',
          carbs: 400,
          calories: 1600,
          logged_at: `${DATE}T07:00:00Z`,
          absorptionType: 'RAPID'
        }
      ]
    })

    // No single step may gain more than the cap allows, after the resting drain is accounted for.
    for (let i = 1; i < points.length; i++) {
      const gain = points[i]!.carbBalance - points[i - 1]!.carbBalance
      expect(gain).toBeLessThanOrEqual(INTERVAL_CARB_ABSORPTION_CAP_G + 1)
    }
  })

  it('drains calories and carbohydrate at the same uplift during a session', () => {
    const workout = [
      {
        id: 'w1',
        title: 'Hard Ride',
        type: 'Ride',
        date: new Date(`${DATE}T00:00:00Z`),
        startTime: new Date(`${DATE}T09:00:00Z`),
        durationSec: 2 * 3600,
        workIntensity: 0.8
      }
    ]

    const withWorkout = timeline({}, workout)
    const restDay = timeline({})

    const carbDelta =
      restDay[restDay.length - 1]!.carbBalance - withWorkout[withWorkout.length - 1]!.carbBalance
    const kcalDelta =
      restDay[restDay.length - 1]!.kcalBalance - withWorkout[withWorkout.length - 1]!.kcalBalance

    expect(carbDelta).toBeGreaterThan(0)
    expect(kcalDelta).toBeGreaterThan(0)

    // The session's calorie cost should track its carbohydrate cost at roughly 4 kcal/g scaled by
    // the 0.8 carbohydrate share the drain model assumes. Previously the calorie side omitted the
    // 1.25 uplift entirely, so this ratio came out a quarter too low.
    const impliedKcalPerGram = kcalDelta / carbDelta
    expect(impliedKcalPerGram).toBeGreaterThan(4)
    expect(impliedKcalPerGram).toBeLessThan(6)
  })

  it('exposes the drain uplift as a named constant', () => {
    expect(WORKOUT_DRAIN_MULTIPLIER).toBeGreaterThan(1)
  })

  it('never lets the tank leave the 0-100 range', () => {
    const points = timeline(
      {
        breakfast: [{ name: 'Big', carbs: 600, calories: 2400, logged_at: `${DATE}T07:00:00Z` }]
      },
      [
        {
          id: 'w1',
          title: 'Monster',
          type: 'Ride',
          date: new Date(`${DATE}T00:00:00Z`),
          startTime: new Date(`${DATE}T10:00:00Z`),
          durationSec: 6 * 3600,
          workIntensity: 0.95
        }
      ]
    )

    for (const point of points) {
      expect(point.level).toBeGreaterThanOrEqual(0)
      expect(point.level).toBeLessThanOrEqual(100)
      expect(point.fluidDeficit).toBeGreaterThanOrEqual(0)
    }
  })
})
