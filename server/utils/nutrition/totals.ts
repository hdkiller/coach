type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner', 'snacks']
const OUNCE_TO_ML = 29.5735

function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function parseFluidMlFromQuantity(quantity: string): number {
  const normalized = quantity.toLowerCase()
  const match = normalized.match(/\b(\d+(?:\.\d+)?)\s*(ml|l|oz|fl\s?oz)\b/)
  if (!match) return 0

  const value = toNumber(match[1])
  const unit = match[2]
  if (!value || !unit) return 0

  if (unit === 'ml') return value
  if (unit === 'l') return value * 1000
  return value * OUNCE_TO_ML
}

function parseFluidMlFromAmountAndUnit(item: Record<string, any>): number {
  const amount = toNumber(item.amount)
  const unit = String(item.unit || '')
    .toLowerCase()
    .trim()

  if (!amount || !unit) return 0
  if (unit === 'ml') return amount
  if (unit === 'l') return amount * 1000
  if (unit === 'oz' || unit === 'fl oz' || unit === 'floz') return amount * OUNCE_TO_ML

  return 0
}

function inferFluidMl(item: Record<string, any>): number {
  const explicit = toNumber(item.fluidMl) || toNumber(item.water_ml) || toNumber(item.waterMl) || 0
  if (explicit > 0) return explicit

  const fromAmountUnit = parseFluidMlFromAmountAndUnit(item)
  if (fromAmountUnit > 0) return fromAmountUnit

  const quantity = String(item.quantity || '')
  const fromQuantity = quantity ? parseFluidMlFromQuantity(quantity) : 0
  return fromQuantity
}

function inferHydrationFactor(item: Record<string, any>): number {
  if (item.entryType === 'HYDRATION') return 1

  const name = String(item.name || '')
    .toLowerCase()
    .trim()

  if (!name) return 1

  // Non-alcoholic beverages still hydrate well, but not as much as plain water.
  if (
    name.includes('non-alcoholic') ||
    name.includes('alcohol free') ||
    name.includes('0.0%') ||
    name.includes('0.0')
  ) {
    return 0.85
  }

  if (
    name.includes('beer') ||
    name.includes('wine') ||
    name.includes('vodka') ||
    name.includes('whisky') ||
    name.includes('whiskey') ||
    name.includes('gin') ||
    name.includes('rum')
  ) {
    return 0.5
  }

  if (
    name.includes('coffee') ||
    name.includes('espresso') ||
    name.includes('tea') ||
    name.includes('cappuccino') ||
    name.includes('latte')
  ) {
    return 0.9
  }

  if (
    name.includes('water') ||
    name.includes('electrolyte') ||
    name.includes('sports drink') ||
    name.includes('isotonic')
  ) {
    return 1
  }

  return 1
}

export function normalizeFluidFields(item: Record<string, any>): Record<string, any> {
  const fluidMl = Math.max(0, Math.round(inferFluidMl(item)))
  const hydrationFactor = inferHydrationFactor(item)
  const hydrationContributionMl = Math.max(0, Math.round(fluidMl * hydrationFactor))

  return {
    ...item,
    fluidMl,
    hydrationFactor,
    hydrationContributionMl,
    // Keep legacy key used in existing payloads.
    water_ml: item.water_ml ?? fluidMl
  }
}

export function getItemHydrationContributionMl(item: Record<string, any>): number {
  const normalized = normalizeFluidFields(item)
  return toNumber(normalized.hydrationContributionMl)
}

export function isHydrationLikeItem(item: Record<string, any>): boolean {
  return item.entryType === 'HYDRATION' || getItemHydrationContributionMl(item) > 0
}

export function recalculateNutritionTotals(nutrition: Record<string, any>): {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  waterMl: number
} {
  let calories = 0
  let protein = 0
  let carbs = 0
  let fat = 0
  let fiber = 0
  let sugar = 0
  let waterMl = 0

  for (const meal of MEAL_KEYS) {
    const items = (nutrition[meal] as any[]) || []
    for (const rawItem of items) {
      const item = normalizeFluidFields(rawItem || {})
      calories += toNumber(item.calories)
      protein += toNumber(item.protein)
      carbs += toNumber(item.carbs)
      fat += toNumber(item.fat)
      fiber += toNumber(item.fiber)
      sugar += toNumber(item.sugar)
      waterMl += toNumber(item.hydrationContributionMl)
    }
  }

  // Backward compatibility and bonus preservation.
  // If the record total is significantly higher than the item sum (e.g. includes meal bonuses),
  // we keep the record total unless the item sum is already high.
  const recordWater = toNumber(nutrition.waterMl)
  if (waterMl < recordWater && waterMl > 0) {
    // If the difference is a multiple of 100 (likely bonuses), keep it.
    const diff = recordWater - waterMl
    if (diff % 100 === 0) {
      waterMl = recordWater
    }
  } else if (waterMl === 0 && recordWater > 0) {
    waterMl = recordWater
  }

  return { calories, protein, carbs, fat, fiber, sugar, waterMl }
}
