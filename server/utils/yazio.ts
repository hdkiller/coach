import { Yazio } from 'yazio'
import type { Integration } from '@prisma/client'
import { getProfileForItem } from './nutrition-domain/absorption'
import { recalculateNutritionTotals } from './nutrition/totals'

export interface YazioDailySummary {
  steps?: number
  activity_energy?: number
  consume_activity_energy?: boolean
  water_intake?: number
  goals?: {
    'energy.energy'?: number
    'nutrient.carb'?: number
    'nutrient.fat'?: number
    'nutrient.protein'?: number
    'activity.step'?: number
    'bodyvalue.weight'?: number
    water?: number
  }
  units?: any
  meals?: any
  user_stats?: any
}

export interface YazioConsumedItem {
  type: string
  date: string
  serving: string | null
  amount: number
  id: string
  product_id: string
  serving_quantity: number | null
  daytime: 'breakfast' | 'lunch' | 'dinner' | 'snack'
}

export interface YazioSimpleProduct {
  id: string
  date: string
  name: string
  type: string
  daytime: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  nutrients?: any
  is_ai_generated?: boolean
}

export interface YazioRecipePortion {
  id: string
  date: string
  type?: string
  daytime: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name?: string
  recipe_name?: string
  title?: string
  serving?: string | null
  amount?: number | null
  serving_quantity?: number | null
  nutrients?: Record<string, number> | null
  recipe?: {
    name?: string
    nutrients?: Record<string, number> | null
  } | null
}

export interface YazioConsumedItemsResponse {
  products: YazioConsumedItem[]
  recipe_portions: YazioRecipePortion[]
  simple_products: YazioSimpleProduct[]
}

type MealGroupKey = 'breakfast' | 'lunch' | 'dinner' | 'snacks'
type MacroTotals = ReturnType<typeof extractMacroFields>
const MEAL_KEYS: MealGroupKey[] = ['breakfast', 'lunch', 'dinner', 'snacks']

function getMealGroupKey(daytime: string | null | undefined): MealGroupKey {
  const normalized = String(daytime || '')
    .toLowerCase()
    .trim()
  if (normalized === 'breakfast' || normalized === 'lunch' || normalized === 'dinner') {
    return normalized
  }
  return 'snacks'
}

function asItemArray(value: unknown): any[] {
  return Array.isArray(value) ? value : []
}

function getYazioIdentity(item: any): string | null {
  if (!item || typeof item !== 'object') return null
  if (typeof item.id === 'string' && item.id.length > 0) return `id:${item.id}`
  return null
}

function hasOwn<T extends string>(value: unknown, key: T): value is Record<T, unknown> {
  return !!value && typeof value === 'object' && key in value
}

function isLikelyYazioItem(item: any, incomingIdentities: Set<string>): boolean {
  if (!item || typeof item !== 'object') return false
  if (item.source === 'yazio') return true

  const identity = getYazioIdentity(item)
  if (identity && incomingIdentities.has(identity)) return true

  return (
    hasOwn(item, 'daytime') ||
    hasOwn(item, 'product_id') ||
    hasOwn(item, 'serving_quantity') ||
    item.type === 'product' ||
    item.type === 'simple_product' ||
    item.type === 'recipe_portion'
  )
}

function isFluidLikeUnit(unit: unknown): boolean {
  const normalized = String(unit || '')
    .toLowerCase()
    .trim()

  return (
    normalized === 'ml' ||
    normalized === 'l' ||
    normalized === 'liter' ||
    normalized === 'liters' ||
    normalized === 'litre' ||
    normalized === 'litres' ||
    normalized === 'milliliter' ||
    normalized === 'milliliters' ||
    normalized === 'millilitre' ||
    normalized === 'millilitres' ||
    normalized === 'oz' ||
    normalized === 'fl oz' ||
    normalized === 'floz' ||
    normalized === 'ounce' ||
    normalized === 'ounces'
  )
}

function toFiniteNumber(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function getNutrientValue(
  nutrients: Record<string, number> | null | undefined,
  key: string,
  fallbacks: string[] = []
): number {
  if (!nutrients) return 0
  const keys = [key, ...fallbacks]

  for (const candidate of keys) {
    const value = nutrients[candidate]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return 0
}

function extractMacroFields(nutrients: Record<string, number> | null | undefined) {
  return {
    calories: getNutrientValue(nutrients, 'energy.energy'),
    protein: getNutrientValue(nutrients, 'nutrient.protein'),
    carbs: getNutrientValue(nutrients, 'nutrient.carb'),
    fat: getNutrientValue(nutrients, 'nutrient.fat'),
    fiber: getNutrientValue(nutrients, 'nutrient.fiber', ['nutrient.dietaryfiber']),
    sugar: getNutrientValue(nutrients, 'nutrient.sugar')
  }
}

function emptyMacroTotals(): MacroTotals {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0
  }
}

function addMacroTotals(target: MacroTotals, source: Partial<MacroTotals>) {
  target.calories += source.calories || 0
  target.protein += source.protein || 0
  target.carbs += source.carbs || 0
  target.fat += source.fat || 0
  target.fiber += source.fiber || 0
  target.sugar += source.sugar || 0
}

function subtractMacroTotals(total: MacroTotals, used: MacroTotals): MacroTotals {
  return {
    calories: Math.max(0, total.calories - used.calories),
    protein: Math.max(0, total.protein - used.protein),
    carbs: Math.max(0, total.carbs - used.carbs),
    fat: Math.max(0, total.fat - used.fat),
    fiber: Math.max(0, total.fiber - used.fiber),
    sugar: Math.max(0, total.sugar - used.sugar)
  }
}

function hasMeaningfulMacros(macros: MacroTotals): boolean {
  return Object.values(macros).some((value) => value > 0)
}

function getMealSummaryMacros(summaryMeals: any, mealTime: MealGroupKey): MacroTotals {
  const mealSummaryKey = mealTime === 'snacks' ? 'snack' : mealTime
  return extractMacroFields(summaryMeals?.[mealSummaryKey]?.nutrients || null)
}

function getRecipePortionWeight(item: YazioRecipePortion): number {
  const portionCount =
    typeof (item as any).portion_count === 'number' && Number.isFinite((item as any).portion_count)
      ? (item as any).portion_count
      : 0
  const amount = typeof item.amount === 'number' && Number.isFinite(item.amount) ? item.amount : 0
  const servingQuantity =
    typeof item.serving_quantity === 'number' && Number.isFinite(item.serving_quantity)
      ? item.serving_quantity
      : 0

  return Math.max(portionCount, amount, servingQuantity, 1)
}

export async function createYazioClient(integration: Integration): Promise<Yazio> {
  return new Yazio({
    credentials: {
      username: integration.accessToken, // Stored in accessToken field
      password: integration.refreshToken! // Stored in refreshToken field
    }
  })
}

export async function fetchYazioDailySummary(
  integration: Integration,
  date: string
): Promise<YazioDailySummary> {
  const yazio = await createYazioClient(integration)
  return (await yazio.user.getDailySummary({ date })) as unknown as YazioDailySummary
}

export async function fetchYazioConsumedItems(
  integration: Integration,
  date: string
): Promise<YazioConsumedItemsResponse> {
  const yazio = await createYazioClient(integration)
  return (await yazio.user.getConsumedItems({ date })) as unknown as YazioConsumedItemsResponse
}

export async function fetchYazioProductDetails(
  integration: Integration,
  productId: string
): Promise<any> {
  const yazio = await createYazioClient(integration)
  return await yazio.products.get(productId)
}

export function mergeYazioNutritionWithExisting(
  incomingNutrition: any,
  existingNutrition: any | null
) {
  if (!existingNutrition) return incomingNutrition

  const incomingIdentities = new Set<string>()
  for (const mealKey of MEAL_KEYS) {
    for (const item of asItemArray(incomingNutrition[mealKey])) {
      const identity = getYazioIdentity(item)
      if (identity) incomingIdentities.add(identity)
    }
  }

  const existingYazioByIdentity = new Map<string, any>()
  const existingMealByIdentity = new Map<string, MealGroupKey>()

  for (const mealKey of MEAL_KEYS) {
    const existingItems = asItemArray(existingNutrition[mealKey])
    for (const existingItem of existingItems) {
      const identity = getYazioIdentity(existingItem)
      if (!identity || !isLikelyYazioItem(existingItem, incomingIdentities)) continue
      existingYazioByIdentity.set(identity, existingItem)
      existingMealByIdentity.set(identity, mealKey)
    }
  }

  const mergedMealItems: Record<MealGroupKey, any[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: []
  }

  for (const mealKey of MEAL_KEYS) {
    const existingItems = asItemArray(existingNutrition[mealKey])
    const existingNonYazioItems = existingItems.filter(
      (item) => !isLikelyYazioItem(item, incomingIdentities)
    )
    const incomingItems = asItemArray(incomingNutrition[mealKey])

    mergedMealItems[mealKey].push(...existingNonYazioItems)

    for (const incomingItem of incomingItems) {
      const identity = getYazioIdentity(incomingItem)
      const existing = identity ? existingYazioByIdentity.get(identity) : null

      if (!existing) {
        mergedMealItems[mealKey].push(incomingItem)
        continue
      }

      const existingLoggedAt =
        typeof existing.logged_at === 'string' && existing.logged_at.length > 0
          ? existing.logged_at
          : null
      const incomingLoggedAt =
        typeof incomingItem.logged_at === 'string' && incomingItem.logged_at.length > 0
          ? incomingItem.logged_at
          : null
      const preserveManualLoggedAt =
        !!existingLoggedAt && !!incomingLoggedAt && existingLoggedAt !== incomingLoggedAt

      const existingWaterMl = toFiniteNumber(existing.water_ml)
      const incomingWaterMl = toFiniteNumber(incomingItem.water_ml)
      const existingFluidMl = toFiniteNumber(existing.fluidMl)
      const incomingFluidMl = toFiniteNumber(incomingItem.fluidMl)
      const preserveFluidOverride =
        existing.entryType === 'HYDRATION' ||
        isFluidLikeUnit(existing.unit) ||
        (existingWaterMl ?? 0) > 0 ||
        (existingFluidMl ?? 0) > 0 ||
        (toFiniteNumber(existing.hydrationContributionMl) ?? 0) > 0

      const mergedItem: any = {
        ...incomingItem,
        id: existing.id || incomingItem.id,
        ...(preserveManualLoggedAt ? { logged_at: existingLoggedAt } : {})
      }

      if (preserveFluidOverride) {
        if (existing.unit !== undefined) mergedItem.unit = existing.unit
        if (existing.quantity !== undefined) mergedItem.quantity = existing.quantity
        if (existing.amount !== undefined) mergedItem.amount = existing.amount
        if (existing.entryType !== undefined) mergedItem.entryType = existing.entryType
        if (
          existing.water_ml !== undefined &&
          ((incomingWaterMl ?? 0) === 0 || incomingItem.unit === 'g')
        ) {
          mergedItem.water_ml = existing.water_ml
        }
        if (existing.fluidMl !== undefined && (incomingFluidMl ?? 0) === 0) {
          mergedItem.fluidMl = existing.fluidMl
        }
        if (existing.hydrationFactor !== undefined) {
          mergedItem.hydrationFactor = existing.hydrationFactor
        }
        if (existing.hydrationContributionMl !== undefined) {
          mergedItem.hydrationContributionMl = existing.hydrationContributionMl
        }
      }

      const existingMeal = identity ? existingMealByIdentity.get(identity) : null
      const targetMealKey = existingMeal && existingMeal !== mealKey ? existingMeal : mealKey
      mergedMealItems[targetMealKey].push(mergedItem)
    }
  }

  const mergedMeals: Record<MealGroupKey, any[] | null> = {
    breakfast: mergedMealItems.breakfast.length ? mergedMealItems.breakfast : null,
    lunch: mergedMealItems.lunch.length ? mergedMealItems.lunch : null,
    dinner: mergedMealItems.dinner.length ? mergedMealItems.dinner : null,
    snacks: mergedMealItems.snacks.length ? mergedMealItems.snacks : null
  }

  const mergedNutrition = {
    ...incomingNutrition,
    ...mergedMeals
  }
  const totals = recalculateNutritionTotals(mergedNutrition)

  return {
    ...mergedNutrition,
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    fiber: totals.fiber,
    sugar: totals.sugar,
    waterMl: totals.waterMl
  }
}

export function normalizeYazioData(
  summary: YazioDailySummary,
  items: YazioConsumedItemsResponse,
  userId: string,
  date: string
) {
  // Parse date string to create Date object at midnight UTC
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  const dateObj = new Date(Date.UTC(year, month - 1, day))

  // Group items by meal time
  const mealGroups: Record<MealGroupKey, any[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: []
  }
  const mealItemMacros: Record<MealGroupKey, MacroTotals> = {
    breakfast: emptyMacroTotals(),
    lunch: emptyMacroTotals(),
    dinner: emptyMacroTotals(),
    snacks: emptyMacroTotals()
  }
  const sparseRecipeIndexes: Record<MealGroupKey, number[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: []
  }

  // Process regular products (manual entries with product_nutrients)
  for (const item of items.products) {
    const mealTime = getMealGroupKey(item.daytime)

    // For regular products, nutrients are in product_nutrients and need to be multiplied by amount
    // product_nutrients contain values per gram/serving, amount is the quantity consumed
    const productNutrients = (item as any).product_nutrients || {}
    const amount = item.amount || 0

    // Calculate actual consumed nutrients by multiplying by amount
    const calories = (productNutrients['energy.energy'] || 0) * amount
    const protein = (productNutrients['nutrient.protein'] || 0) * amount
    const carbs = (productNutrients['nutrient.carb'] || 0) * amount
    const fat = (productNutrients['nutrient.fat'] || 0) * amount
    const fiber =
      (productNutrients['nutrient.fiber'] || productNutrients['nutrient.dietaryfiber'] || 0) *
      amount
    const sugar = (productNutrients['nutrient.sugar'] || 0) * amount

    // Add calculated nutrients to the item
    const enrichedItem = {
      ...item,
      logged_at: item.date, // Preserve Yazio's original timestamp
      source: 'yazio',
      calories: calories,
      protein: protein,
      carbs: carbs,
      fat: fat,
      fiber: fiber,
      sugar: sugar
    }

    mealGroups[mealTime]!.push(enrichedItem)
    addMacroTotals(mealItemMacros[mealTime], enrichedItem)
  }

  // Process simple products (AI-generated items with names already included)
  for (const item of items.simple_products || []) {
    const mealTime = getMealGroupKey(item.daytime)

    // Extract nutrients from the nested structure
    const nutrients = item.nutrients || {}
    const { calories, protein, carbs, fat, fiber, sugar } = extractMacroFields(nutrients)

    // Transform simple_product to match the expected structure with top-level nutrient fields
    const transformedItem = {
      id: item.id,
      date: item.date,
      logged_at: item.date, // Preserve Yazio's original timestamp
      type: item.type,
      daytime: item.daytime,
      product_name: item.name, // Already has the name!
      product_brand: null,
      is_ai_generated: item.is_ai_generated,
      source: 'yazio',
      nutrients: item.nutrients, // Keep original for reference
      // Add top-level fields for easy access in analysis
      calories: calories,
      protein: protein,
      carbs: carbs,
      fat: fat,
      fiber: fiber,
      sugar: sugar
    }

    mealGroups[mealTime]!.push(transformedItem)
    addMacroTotals(mealItemMacros[mealTime], transformedItem)
  }

  // Process recipe portions (custom or saved recipes)
  for (const item of items.recipe_portions || []) {
    const mealTime = getMealGroupKey(item.daytime)
    const nutrients = item.nutrients || item.recipe?.nutrients || null
    const { calories, protein, carbs, fat, fiber, sugar } = extractMacroFields(nutrients)

    const transformedItem = {
      id: item.id,
      date: item.date,
      logged_at: item.date,
      type: item.type || 'recipe_portion',
      daytime: item.daytime,
      product_name: item.name || item.recipe_name || item.recipe?.name || item.title || 'Recipe',
      product_brand: null,
      serving: item.serving ?? null,
      amount: item.amount ?? item.serving_quantity ?? null,
      serving_quantity: item.serving_quantity ?? null,
      source: 'yazio',
      nutrients,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugar
    }

    mealGroups[mealTime]!.push(transformedItem)

    if (hasMeaningfulMacros({ calories, protein, carbs, fat, fiber, sugar })) {
      addMacroTotals(mealItemMacros[mealTime], transformedItem)
    } else {
      sparseRecipeIndexes[mealTime].push(mealGroups[mealTime].length - 1)
    }
  }

  // Yazio sometimes returns recipe portions without per-item nutrients, even though
  // the meal summary still includes the correct combined macros for that meal.
  for (const mealTime of Object.keys(mealGroups) as MealGroupKey[]) {
    const missingIndexes = sparseRecipeIndexes[mealTime]
    if (missingIndexes.length === 0) continue

    const mealSummaryMacros = getMealSummaryMacros(summary.meals || {}, mealTime)
    const remainingMacros = subtractMacroTotals(mealSummaryMacros, mealItemMacros[mealTime])
    if (!hasMeaningfulMacros(remainingMacros)) continue

    const missingItems = missingIndexes.map(
      (index) => mealGroups[mealTime][index] as YazioRecipePortion
    )
    const totalWeight = missingItems.reduce((sum, item) => sum + getRecipePortionWeight(item), 0)
    const assignedMacros = emptyMacroTotals()

    missingIndexes.forEach((index, position) => {
      const item = mealGroups[mealTime][index] as any
      const isLast = position === missingIndexes.length - 1
      const ratio =
        totalWeight > 0
          ? getRecipePortionWeight(item as YazioRecipePortion) / totalWeight
          : 1 / missingIndexes.length
      const recoveredMacros = isLast
        ? subtractMacroTotals(remainingMacros, assignedMacros)
        : {
            calories: remainingMacros.calories * ratio,
            protein: remainingMacros.protein * ratio,
            carbs: remainingMacros.carbs * ratio,
            fat: remainingMacros.fat * ratio,
            fiber: remainingMacros.fiber * ratio,
            sugar: remainingMacros.sugar * ratio
          }

      item.calories = recoveredMacros.calories
      item.protein = recoveredMacros.protein
      item.carbs = recoveredMacros.carbs
      item.fat = recoveredMacros.fat
      item.fiber = recoveredMacros.fiber
      item.sugar = recoveredMacros.sugar
      item.nutrients = item.nutrients || {
        'energy.energy': recoveredMacros.calories,
        'nutrient.protein': recoveredMacros.protein,
        'nutrient.carb': recoveredMacros.carbs,
        'nutrient.fat': recoveredMacros.fat,
        ...(recoveredMacros.fiber > 0 ? { 'nutrient.fiber': recoveredMacros.fiber } : {}),
        ...(recoveredMacros.sugar > 0 ? { 'nutrient.sugar': recoveredMacros.sugar } : {})
      }

      addMacroTotals(assignedMacros, recoveredMacros)
      addMacroTotals(mealItemMacros[mealTime], recoveredMacros)
    })
  }

  // Calculate totals from meals data
  const meals = summary.meals || {}
  const totals = emptyMacroTotals()

  // Sum up nutrients from all meals if available
  Object.entries(meals).forEach(([mealName, meal]: [string, any]) => {
    if (meal?.nutrients) {
      const mealNutrients = {
        calories: meal.nutrients['energy.energy'] || 0,
        protein: meal.nutrients['nutrient.protein'] || 0,
        carbs: meal.nutrients['nutrient.carb'] || 0,
        fat: meal.nutrients['nutrient.fat'] || 0,
        fiber: meal.nutrients['nutrient.fiber'] || 0,
        sugar: meal.nutrients['nutrient.sugar'] || 0
      }

      totals.calories += mealNutrients.calories
      totals.protein += mealNutrients.protein
      totals.carbs += mealNutrients.carbs
      totals.fat += mealNutrients.fat
      totals.fiber += mealNutrients.fiber
      totals.sugar += mealNutrients.sugar
    }
  })

  const result = {
    userId,
    date: dateObj,
    calories: totals.calories || null,
    protein: totals.protein || null,
    carbs: totals.carbs || null,
    fat: totals.fat || null,
    fiber: totals.fiber || null,
    sugar: totals.sugar || null,
    waterMl: summary.water_intake || null,
    caloriesGoal: summary.goals?.['energy.energy'] || null,
    proteinGoal: summary.goals?.['nutrient.protein'] || null,
    carbsGoal: summary.goals?.['nutrient.carb'] || null,
    fatGoal: summary.goals?.['nutrient.fat'] || null,
    breakfast: mealGroups.breakfast!.length > 0 ? mealGroups.breakfast : null,
    lunch: mealGroups.lunch!.length > 0 ? mealGroups.lunch : null,
    dinner: mealGroups.dinner!.length > 0 ? mealGroups.dinner : null,
    snacks: mealGroups.snacks!.length > 0 ? mealGroups.snacks : null,
    sourcePrecedence: 'yazio',
    rawJson: { summary, items }
  }

  return result
}
