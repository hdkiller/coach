type NutritionLike = {
  caloriesGoal?: number | null
  carbsGoal?: number | null
  proteinGoal?: number | null
  fatGoal?: number | null
  fuelingPlan?: {
    dailyTotals?: {
      calories?: number | null
      carbs?: number | null
      protein?: number | null
      fat?: number | null
    } | null
  } | null
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export function applyCanonicalNutritionTargets<T extends NutritionLike>(nutrition: T): T {
  const dailyTotals = nutrition?.fuelingPlan?.dailyTotals
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
