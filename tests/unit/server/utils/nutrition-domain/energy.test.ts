import { describe, expect, it } from 'vitest'
import {
  calculateDailyCalorieBreakdown,
  estimateWorkoutCalories,
  getEnergyModel
} from '../../../../../server/utils/nutrition-domain/energy'
import type { FuelingProfile } from '../../../../../server/utils/nutrition-domain/types'

const profile: FuelingProfile = {
  weight: 80,
  ftp: 250,
  currentCarbMax: 90,
  bmr: 1600,
  activityLevel: 'ACTIVE',
  baseCaloriesMode: 'AUTO',
  targetAdjustmentPercent: 0
}

describe('getEnergyModel', () => {
  it('routes each sport to the right cost model', () => {
    expect(getEnergyModel('Ride')).toBe('CYCLING')
    expect(getEnergyModel('VirtualRide')).toBe('CYCLING')
    expect(getEnergyModel('Run')).toBe('RUN')
    expect(getEnergyModel('TrailRun')).toBe('RUN')
    expect(getEnergyModel('Swim')).toBe('SWIM')
    expect(getEnergyModel('WeightTraining')).toBe('RESISTANCE')
    expect(getEnergyModel('Weight Training')).toBe('RESISTANCE')
    expect(getEnergyModel('Yoga')).toBe('LOW_INTENSITY')
    expect(getEnergyModel('Kitesurfing')).toBe('DEFAULT')
  })
})

describe('estimateWorkoutCalories', () => {
  it('costs cycling from power', () => {
    // 250W FTP at 0.8 IF for an hour = 200W = 720 kJ.
    const kcal = estimateWorkoutCalories(profile, {
      type: 'Ride',
      intensity: 0.8,
      durationHours: 1
    })
    expect(kcal).toBe(720)
  })

  it('does not use FTP to cost a run', () => {
    const run = estimateWorkoutCalories(profile, {
      type: 'Run',
      intensity: 0.8,
      durationHours: 1
    })
    const ride = estimateWorkoutCalories(profile, {
      type: 'Ride',
      intensity: 0.8,
      durationHours: 1
    })

    expect(run).not.toBe(ride)
    // An hour of running for an 80kg athlete lands in a physiologically sane band.
    expect(run).toBeGreaterThan(700)
    expect(run).toBeLessThan(1300)
  })

  it('costs a gym session far below an equivalent hour of endurance work', () => {
    const gym = estimateWorkoutCalories(profile, {
      type: 'WeightTraining',
      intensity: 0.8,
      durationHours: 1
    })

    expect(gym).toBeGreaterThan(300)
    expect(gym).toBeLessThan(700)
  })

  it('scales with bodyweight for MET-based sports but not for cycling', () => {
    const heavy = { ...profile, weight: 100 }

    expect(
      estimateWorkoutCalories(heavy, { type: 'Run', intensity: 0.7, durationHours: 1 })
    ).toBeGreaterThan(
      estimateWorkoutCalories(profile, { type: 'Run', intensity: 0.7, durationHours: 1 })
    )
    expect(estimateWorkoutCalories(heavy, { type: 'Ride', intensity: 0.7, durationHours: 1 })).toBe(
      estimateWorkoutCalories(profile, { type: 'Ride', intensity: 0.7, durationHours: 1 })
    )
  })

  it('returns nothing for a zero-length session', () => {
    expect(
      estimateWorkoutCalories(profile, { type: 'Ride', intensity: 0.8, durationHours: 0 })
    ).toBe(0)
  })
})

describe('calculateDailyCalorieBreakdown', () => {
  it('prefers measured calories over the estimate', () => {
    const breakdown = calculateDailyCalorieBreakdown(profile, [
      {
        title: 'Ride',
        type: 'Ride',
        durationHours: 1,
        intensity: 0.8,
        calories: 950,
        source: 'completed'
      }
    ])

    expect(breakdown.activityCalories).toBe(950)
    expect(breakdown.workouts[0]?.sourceType).toBe('actual')
  })

  it('ignores calories attached to a merely planned workout', () => {
    const breakdown = calculateDailyCalorieBreakdown(profile, [
      {
        title: 'Ride',
        type: 'Ride',
        durationHours: 1,
        intensity: 0.8,
        calories: 950,
        source: 'planned'
      }
    ])

    expect(breakdown.activityCalories).toBe(720)
    expect(breakdown.workouts[0]?.sourceType).toBe('estimated')
  })

  it('no longer inflates a strength day through the cycling power model', () => {
    const breakdown = calculateDailyCalorieBreakdown(profile, [
      { title: 'Strength', type: 'WeightTraining', durationHours: 1, intensity: 0.8 }
    ])

    // The old model charged FTP x IF x 3.6 = 720 kcal for an hour in the gym.
    expect(breakdown.activityCalories).toBeLessThan(720)
  })
})
