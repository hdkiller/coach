import { describe, expect, it } from 'vitest'
import { calculateDailyCalorieBreakdown } from '../../../../../server/utils/nutrition-domain/fueling-plan'

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
