import { requireAuth } from '../../../utils/auth-guard'
import {
  CONCURRENT_UPDATE_CONFLICT,
  nutritionRepository
} from '../../../utils/repositories/nutritionRepository'
import { z } from 'zod/v3'
import { metabolicService } from '../../../utils/services/metabolicService'
import { nutritionPlanService } from '../../../utils/services/nutritionPlanService'
import { normalizeFluidFields, recalculateNutritionTotals } from '../../../utils/nutrition/totals'

const ABSORPTION_TYPES = ['RAPID', 'FAST', 'BALANCED', 'DENSE', 'HYPER_LOAD'] as const
const LEGACY_ABSORPTION_TYPE_MAP: Record<string, (typeof ABSORPTION_TYPES)[number]> = {
  SIMPLE: 'RAPID',
  INTERMEDIATE: 'FAST',
  COMPLEX: 'BALANCED'
}

function normalizeAbsorptionType(value: unknown) {
  if (value == null || value === '') return undefined
  const normalized = String(value).toUpperCase()
  return LEGACY_ABSORPTION_TYPE_MAP[normalized] || normalized
}

function coerceNumberOrZero(value: unknown) {
  if (value == null || value === '') return 0
  return value
}

const ItemSchema = z.object({
  id: z.preprocess((value) => (value === null ? undefined : value), z.string().optional()),
  name: z.string(),
  calories: z.preprocess(coerceNumberOrZero, z.coerce.number()),
  protein: z.preprocess(coerceNumberOrZero, z.coerce.number()),
  carbs: z.preprocess(coerceNumberOrZero, z.coerce.number()),
  fat: z.preprocess(coerceNumberOrZero, z.coerce.number()),
  fiber: z.coerce.number().optional(),
  sugar: z.coerce.number().optional(),
  water_ml: z.coerce.number().optional(),
  amount: z.coerce.number().optional(),
  unit: z.string().optional(),
  logged_at: z.string().optional(),
  absorptionType: z.preprocess(normalizeAbsorptionType, z.enum(ABSORPTION_TYPES).optional())
})

const PatchSchema = z.object({
  action: z.enum(['add', 'update', 'delete']),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snacks']),
  item: ItemSchema.optional(),
  itemId: z.preprocess((value) => (value === null ? undefined : value), z.string().optional())
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['nutrition:write'])
  const userId = user.id
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  let parsed: any
  try {
    parsed = PatchSchema.parse(body)
  } catch (err: any) {
    throw createError({
      statusCode: 400,
      message: `Invalid request body: ${err.message}`
    })
  }
  const { action, mealType, item, itemId } = parsed

  let nutrition: any
  if (/^\d{4}-\d{2}-\d{2}$/.test(id!)) {
    const dateObj = new Date(`${id}T00:00:00Z`)
    nutrition = await nutritionRepository.getByDate(userId, dateObj)
  } else {
    nutrition = await nutritionRepository.getById(id!, userId)
  }

  if (!nutrition) {
    if (action === 'add' && /^\d{4}-\d{2}-\d{2}$/.test(id!)) {
      const dateObj = new Date(`${id}T00:00:00Z`)
      nutrition = await nutritionRepository.create({
        userId,
        date: dateObj,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        waterMl: 0,
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: []
      })
    } else {
      throw createError({ statusCode: 404, message: 'Nutrition entry not found' })
    }
  }

  const mealsList = ['breakfast', 'lunch', 'dinner', 'snacks']
  const expectedUpdatedAt = nutrition.updatedAt
  const currentItems = (nutrition[mealType] as any[]) || []
  let updatedItems = [...currentItems]
  let movedFromMeal: string | null = null
  let movedFromMealItems: any[] | null = null

  if (action === 'add') {
    if (!item) throw createError({ statusCode: 400, message: 'Item is required for add' })
    updatedItems.push(
      normalizeFluidFields({
        ...item,
        id: item.id || crypto.randomUUID(),
        source: 'manual'
      })
    )
  } else if (action === 'update') {
    if (!item) throw createError({ statusCode: 400, message: 'Item is required for update' })

    let index = -1
    if (item.id) {
      index = updatedItems.findIndex((i) => i.id === item.id)
    }

    // Fallback matching for items without IDs
    if (index === -1) {
      index = updatedItems.findIndex(
        (i) => i.name === item.name && Math.abs((i.calories || 0) - (item.calories || 0)) < 1
      )
    }

    // If still not found, search in other meals if ID is provided
    if (index === -1 && item.id) {
      for (const m of mealsList) {
        if (m === mealType) continue
        const otherItems = (nutrition[m] as any[]) || []
        const otherIndex = otherItems.findIndex((i) => i.id === item.id)
        if (otherIndex !== -1) {
          // Found it in another meal! Remove it from there (in memory only) and
          // add it to the target mealType. Both changes are committed together
          // in the single atomic write below, so a cross-meal move can never
          // leave the item removed from the source meal without also being
          // added to the target meal (or vice versa).
          const remainingOtherItems = [...otherItems]
          const [foundItem] = remainingOtherItems.splice(otherIndex, 1)
          movedFromMeal = m
          movedFromMealItems = remainingOtherItems

          // Update the local list and set the index
          index = updatedItems.length
          updatedItems.push(foundItem!)
          break
        }
      }
    }

    if (index === -1) throw createError({ statusCode: 404, message: 'Item not found in any meal' })

    const isFitbitItem = (updatedItems[index] as any)?.source === 'fitbit'
    const incomingLoggedAt = typeof item.logged_at === 'string' ? item.logged_at.trim() : ''
    const existingLoggedAt =
      typeof (updatedItems[index] as any)?.logged_at === 'string'
        ? (updatedItems[index] as any).logged_at.trim()
        : ''
    const manuallyOverrodeTime =
      incomingLoggedAt.length > 0 && incomingLoggedAt !== existingLoggedAt
    const preserveManualMealOverride =
      isFitbitItem && (updatedItems[index] as any)?.fitbitMealDerived === false

    // Update the item and ensure it has an ID now
    updatedItems[index] = {
      ...updatedItems[index],
      ...normalizeFluidFields(item),
      id: updatedItems[index].id || item.id || crypto.randomUUID(),
      ...(isFitbitItem && manuallyOverrodeTime ? { fitbitTimeDerived: false } : {}),
      ...(preserveManualMealOverride ? { fitbitMealDerived: false } : {}),
      ...(isFitbitItem && movedFromMeal && movedFromMeal !== mealType
        ? { fitbitMealDerived: false }
        : {})
    }
  } else if (action === 'delete') {
    if (!itemId && !item)
      throw createError({
        statusCode: 400,
        message: 'itemId or item details are required for delete'
      })

    if (itemId) {
      updatedItems = updatedItems.filter((i) => i.id !== itemId)
    } else if (item) {
      // Fallback matching for delete
      const index = updatedItems.findIndex(
        (i) => i.name === item.name && Math.abs((i.calories || 0) - (item.calories || 0)) < 1
      )
      if (index !== -1) {
        updatedItems.splice(index, 1)
      }
    }
  }

  // Build every field this mutation touches into a single payload: the meal
  // array(s) and the recalculated totals. Recalculating totals from the
  // in-memory merged state (rather than re-reading from the DB after a first
  // write) lets the whole mutation land in one atomic statement.
  const mealChanges: Record<string, any[]> = { [mealType]: updatedItems }
  if (movedFromMeal && movedFromMealItems && movedFromMeal !== mealType) {
    mealChanges[movedFromMeal] = movedFromMealItems
  }

  const mergedForTotals = { ...nutrition, ...mealChanges }
  const totals = recalculateNutritionTotals(mergedForTotals)

  const result = await nutritionRepository.updateWithVersionCheck(nutrition.id, expectedUpdatedAt, {
    ...mealChanges,
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    fiber: totals.fiber,
    sugar: totals.sugar,
    waterMl: totals.waterMl
  })

  if (result === CONCURRENT_UPDATE_CONFLICT) {
    throw createError({
      statusCode: 409,
      message: 'This nutrition entry was updated elsewhere. Please refresh and try again.'
    })
  }

  const updatedNutrition = result

  // REACTIVE: Trigger fueling plan update for the entry date
  try {
    await metabolicService.calculateFuelingPlanForDate(userId, updatedNutrition.date, {
      persist: true
    })
    await nutritionPlanService.reconcileLoggedMealsForDate(userId, updatedNutrition.date)
  } catch (err) {
    console.error('[NutritionItemsPatch] Failed to trigger regeneration:', err)
  }

  return { success: true, mealType, items: updatedItems }
})
