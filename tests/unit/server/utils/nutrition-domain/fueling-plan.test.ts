import { describe, expect, it } from 'vitest'
import {
  calculateDailyCalorieBreakdown,
  calculateFuelingStrategy,
  calculateMacroTargetCalories
} from '../../../../../server/utils/nutrition-domain/fueling-plan'

describe('calculateMacroTargetCalories', () => {
  it('converts macro targets to a canonical calorie target', () => {
    expect(calculateMacroTargetCalories(218, 126, 79)).toBe(2087)
  })
})

describe('calculateFuelingStrategy', () => {
  it('keeps non-rest calorie targets aligned with generated macro targets', () => {
    const plan = calculateFuelingStrategy(
      {
        weight: 78,
        ftp: 260,
        currentCarbMax: 90,
        bmr: 1600,
        activityLevel: 'ACTIVE',
        baseCaloriesMode: 'AUTO',
        targetAdjustmentPercent: -15,
        baseProteinPerKg: 1.6,
        baseFatPerKg: 1
      },
      {
        id: 'workout-1',
        title: 'Tempo',
        durationSec: 3600,
        intensity: 0.75,
        type: 'Ride',
        date: new Date('2026-04-13T00:00:00.000Z')
      }
    )

    expect(plan.dailyTotals.calories).toBe(
      calculateMacroTargetCalories(
        plan.dailyTotals.carbs,
        plan.dailyTotals.protein,
        plan.dailyTotals.fat
      )
    )
    expect(plan.dailyTotals.calories).not.toBe(plan.dailyTotals.baseCalories)
  })
})

describe('calculateDailyCalorieBreakdown', () => {
  it('uses auto BMR x activity baseline when baseCaloriesMode is AUTO', () => {
    const breakdown = calculateDailyCalorieBreakdown(
      {
        weight: 75,
        ftp: 250,
        currentCarbMax: 90,
        bmr: 1400,
        activityLevel: 'ACTIVE',
        baseCaloriesMode: 'AUTO',
        targetAdjustmentPercent: 0
      },
      []
    )

    expect(breakdown.baseCaloriesMode).toBe('AUTO')
    expect(breakdown.baseCalories).toBe(2170)
    expect(breakdown.activityCalories).toBe(0)
    expect(breakdown.totalTarget).toBe(2170)
  })

  it('uses manual non-exercise baseline when configured', () => {
    const breakdown = calculateDailyCalorieBreakdown(
      {
        weight: 75,
        ftp: 250,
        currentCarbMax: 90,
        bmr: 1400,
        activityLevel: 'EXTRA_ACTIVE',
        baseCaloriesMode: 'MANUAL_NON_EXERCISE',
        nonExerciseBaseCalories: 1900,
        targetAdjustmentPercent: 0
      },
      []
    )

    expect(breakdown.baseCaloriesMode).toBe('MANUAL_NON_EXERCISE')
    expect(breakdown.baseCalories).toBe(1900)
    expect(breakdown.activityCalories).toBe(0)
    expect(breakdown.totalTarget).toBe(1900)
  })

  it('applies goal adjustment on top of manual baseline and activity calories', () => {
    const breakdown = calculateDailyCalorieBreakdown(
      {
        weight: 75,
        ftp: 250,
        currentCarbMax: 90,
        baseCaloriesMode: 'MANUAL_NON_EXERCISE',
        nonExerciseBaseCalories: 1900,
        targetAdjustmentPercent: -10
      },
      [{ title: 'Rest', type: 'Rest', durationHours: 0 }]
    )

    expect(breakdown.baseCalories).toBe(1900)
    expect(breakdown.activityCalories).toBe(0)
    expect(breakdown.adjustmentCalories).toBe(-190)
    expect(breakdown.totalTarget).toBe(1710)
  })
})
