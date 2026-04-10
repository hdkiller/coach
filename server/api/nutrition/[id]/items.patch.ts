import { getServerSession } from '../../../utils/session'
import { nutritionRepository } from '../../../utils/repositories/nutritionRepository'
import { z } from 'zod'
import { metabolicService } from '../../../utils/services/metabolicService'
import { nutritionPlanService } from '../../../utils/services/nutritionPlanService'
import { MEAL_LINKED_WATER_ML } from '../../../utils/nutrition/hydration'
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
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
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

  let nutrition: any = null
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
  const currentItems = (nutrition[mealType] as any[]) || []
  let updatedItems = [...currentItems]
  let movedFromMeal: string | null = null

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
          // Found it in another meal!
          // We need to remove it from there and add it to the target mealType
          const [foundItem] = otherItems.splice(otherIndex, 1)
          nutrition = await nutritionRepository.update(nutrition.id, { [m]: otherItems })
          movedFromMeal = m

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

  // Update record
  const updatedNutrition = await nutritionRepository.update(nutrition.id, {
    [mealType]: updatedItems
  })

  const totals = recalculateNutritionTotals(updatedNutrition)

  await nutritionRepository.update(updatedNutrition.id, {
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    fiber: totals.fiber,
    sugar: totals.sugar,
    waterMl: totals.waterMl
  })

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
