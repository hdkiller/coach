type NutritionLike = {
  caloriesGoal?: number | null
  carbsGoal?: number | null
  proteinGoal?: number | null
  fatGoal?: number | null
  fuelingPlan?: unknown
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export function applyCanonicalNutritionTargets<T extends NutritionLike>(nutrition: T): T {
  const fuelingPlan =
    nutrition?.fuelingPlan && typeof nutrition.fuelingPlan === 'object'
      ? (nutrition.fuelingPlan as { dailyTotals?: Record<string, unknown> | null })
      : null
  const dailyTotals = fuelingPlan?.dailyTotals
  if (!dailyTotals) return nutrition

  return {
    ...nutrition,
    caloriesGoal: isFiniteNumber(dailyTotals.calories)
      ? dailyTotals.calories
      : (nutrition.caloriesGoal ?? null),
    carbsGoal: isFiniteNumber(dailyTotals.carbs)
      ? dailyTotals.carbs
      : (nutrition.carbsGoal ?? null),
    proteinGoal: isFiniteNumber(dailyTotals.protein)
      ? dailyTotals.protein
      : (nutrition.proteinGoal ?? null),
    fatGoal: isFiniteNumber(dailyTotals.fat) ? dailyTotals.fat : (nutrition.fatGoal ?? null)
  }
}
