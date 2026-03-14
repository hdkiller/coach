import { describe, expect, it } from 'vitest'

import { applyCanonicalNutritionTargets } from '../../../../server/utils/nutrition/canonical-targets'

describe('applyCanonicalNutritionTargets', () => {
  it('prefers fueling plan daily totals over stale top-level goals', () => {
    const result = applyCanonicalNutritionTargets({
      caloriesGoal: 2000,
      carbsGoal: 170.7,
      proteinGoal: 185.3,
      fatGoal: 58.1,
      fuelingPlan: {
        dailyTotals: {
          calories: 3164,
          carbs: 295,
          protein: 145,
          fat: 91
        }
      }
    })

    expect(result.caloriesGoal).toBe(3164)
    expect(result.carbsGoal).toBe(295)
    expect(result.proteinGoal).toBe(145)
    expect(result.fatGoal).toBe(91)
  })

  it('leaves imported goals intact when no fueling plan exists', () => {
    const result = applyCanonicalNutritionTargets({
      caloriesGoal: 2000,
      carbsGoal: 170.7,
      proteinGoal: 185.3,
      fatGoal: 58.1,
      fuelingPlan: null
    })

    expect(result.caloriesGoal).toBe(2000)
    expect(result.carbsGoal).toBe(170.7)
    expect(result.proteinGoal).toBe(185.3)
    expect(result.fatGoal).toBe(58.1)
  })
})
