import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { nutritionRepository } from '../../utils/repositories/nutritionRepository'
import { metabolicService } from '../../utils/services/metabolicService'
import { getUserNutritionSettings } from '../../utils/nutrition/settings'
import { getUserTimezone, getStartOfLocalDateUTC } from '../../utils/date'

const foodItemSchema = z.object({
  name: z.string(),
  calories: z.number().optional(),
  carbs: z.number().optional(),
  protein: z.number().optional(),
  fat: z.number().optional(),
  fiber: z.number().optional(),
  sugar: z.number().optional(),
  logged_at: z.string(), // Required: Exact time of consumption (ISO string)
  absorptionType: z.enum(['RAPID', 'FAST', 'BALANCED', 'DENSE', 'HYPER_LOAD']).optional(),
  quantity: z.string().optional()
})

const nutritionUploadSchema = z.object({
  date: z.string(), // ISO date or YYYY-MM-DD
  items: z.array(foodItemSchema).optional(),
  // Totals can still be provided as overrides
  calories: z.number().int().optional(),
  carbs: z.number().optional(),
  protein: z.number().optional(),
  fat: z.number().optional(),
  waterMl: z.number().int().optional(),
  rawJson: z.any().optional()
})

defineRouteMeta({
  openAPI: {
    tags: ['Nutrition'],
    summary: 'Upload nutrition data',
    description: 'Logs or updates nutrition data using a flat list of items with timestamps.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/NutritionUpload'
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: { type: 'object' }
              }
            }
          }
        }
      },
      400: { description: 'Invalid data' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' }
    },
    $global: {
      components: {
        schemas: {
          FoodItem: {
            type: 'object',
            required: ['name', 'logged_at'],
            properties: {
              name: { type: 'string' },
              calories: { type: 'number' },
              carbs: { type: 'number' },
              protein: { type: 'number' },
              fat: { type: 'number' },
              fiber: { type: 'number' },
              sugar: { type: 'number' },
              logged_at: { type: 'string', format: 'date-time', description: 'ISO 8601 timestamp' },
              absorptionType: {
                type: 'string',
                enum: ['RAPID', 'FAST', 'BALANCED', 'DENSE', 'HYPER_LOAD'],
                default: 'BALANCED'
              },
              quantity: { type: 'string' }
            }
          },
          NutritionUpload: {
            type: 'object',
            required: ['date'],
            properties: {
              date: { type: 'string', format: 'date', description: 'YYYY-MM-DD or ISO string' },
              items: { type: 'array', items: { $ref: '#/components/schemas/FoodItem' } },
              calories: { type: 'integer', description: 'Optional override for daily total' },
              carbs: { type: 'number', description: 'Optional override for daily total' },
              protein: { type: 'number', description: 'Optional override for daily total' },
              fat: { type: 'number', description: 'Optional override for daily total' },
              waterMl: { type: 'integer' },
              rawJson: {
                type: 'object',
                description: 'Raw developer data for historical reference'
              }
            }
          }
        }
      }
    }
  }
})

export default defineEventHandler(async (event) => {
  // 1. Check authentication
  const user = await requireAuth(event, ['nutrition:write'])

  // 2. Validate request body
  const body = await readBody(event)
  const result = nutritionUploadSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid nutrition data',
      data: result.error.issues
    })
  }

  const { date, items = [], rawJson, ...totals } = result.data
  const userId = user.id

  // 3. Setup date and timezone
  const parsedDate = new Date(date)
  const targetDate = new Date(
    Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate())
  )
  const timezone = await getUserTimezone(userId)
  const settings = await getUserNutritionSettings(userId)

  // 4. Categorize items into DB buckets (breakfast, lunch, dinner, snacks)
  // We use the user's mealPattern to find the closest bucket for each item
  const mealGroups: any = { breakfast: [], lunch: [], dinner: [], snacks: [] }
  const pattern = (settings.mealPattern as Array<{ name: string; time: string }>) || []

  // Helper to map 24h time to minutes for comparison
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  // Define bucket boundaries based on user pattern
  // Default fallback if pattern is weird: 10:00 (Breakfast ends), 14:00 (Lunch ends), 17:00 (Snack ends)
  const breakfastTime = timeToMinutes(
    pattern.find((p) => p.name.toLowerCase() === 'breakfast')?.time || '07:00'
  )
  const lunchTime = timeToMinutes(
    pattern.find((p) => p.name.toLowerCase() === 'lunch')?.time || '12:00'
  )
  const dinnerTime = timeToMinutes(
    pattern.find((p) => p.name.toLowerCase() === 'dinner')?.time || '18:00'
  )
  const snackTime = timeToMinutes(
    pattern.find((p) => p.name.toLowerCase().includes('snack'))?.time || '15:00'
  )

  // Source attribution
  const source = event.context.authType === 'oauth' ? `oauth:${event.context.oauthAppId}` : 'manual'

  let calcCalories = 0
  let calcCarbs = 0
  let calcProtein = 0
  let calcFat = 0
  let calcFiber = 0
  let calcSugar = 0

  for (const item of items) {
    const itemDate = new Date(item.logged_at)
    const itemMinutes = itemDate.getUTCHours() * 60 + itemDate.getUTCMinutes()

    // Enrich item with source and ID
    const enrichedItem = {
      ...item,
      id: crypto.randomUUID(),
      source,
      absorptionType: item.absorptionType || 'BALANCED'
    }

    // Assign to bucket based on proximity to user windows
    // This is a simple "closest time" logic
    const diffs = [
      { key: 'breakfast', diff: Math.abs(itemMinutes - breakfastTime) },
      { key: 'lunch', diff: Math.abs(itemMinutes - lunchTime) },
      { key: 'dinner', diff: Math.abs(itemMinutes - dinnerTime) },
      { key: 'snacks', diff: Math.abs(itemMinutes - snackTime) }
    ]

    const bestBucket = diffs.sort((a, b) => a.diff - b.diff)[0]!.key
    mealGroups[bestBucket].push(enrichedItem)

    // Add to calculated totals
    calcCalories += item.calories || 0
    calcCarbs += item.carbs || 0
    calcProtein += item.protein || 0
    calcFat += item.fat || 0
    calcFiber += item.fiber || 0
    calcSugar += item.sugar || 0
  }

  // 5. Build final payload
  const finalData: any = {
    ...mealGroups,
    waterMl: totals.waterMl,
    rawJson: rawJson || null
  }

  // Use overrides if provided, otherwise use calculated totals
  finalData.calories = totals.calories !== undefined ? totals.calories : Math.round(calcCalories)
  finalData.carbs = totals.carbs !== undefined ? totals.carbs : calcCarbs
  finalData.protein = totals.protein !== undefined ? totals.protein : calcProtein
  finalData.fat = totals.fat !== undefined ? totals.fat : calcFat
  finalData.fiber = calcFiber // Always calculate these as they aren't usually overridden
  finalData.sugar = calcSugar

  // 6. Upsert to DB
  const { record } = await nutritionRepository.upsert(
    userId,
    targetDate,
    { ...finalData, userId, date: targetDate },
    finalData,
    source
  )

  // 7. REACTIVE: Recalculate fueling plan
  try {
    await metabolicService.calculateFuelingPlanForDate(userId, targetDate, {
      persist: true
    })
  } catch (err) {
    console.error('[NutritionUpload] Failed to trigger plan regeneration:', err)
  }

  return {
    success: true,
    data: record
  }
})
