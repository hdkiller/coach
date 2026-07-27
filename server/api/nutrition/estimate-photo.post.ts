import { z } from 'zod/v3'
import { generateObject } from 'ai'
import { createGoogle } from '@ai-sdk/google'
import { requireAuth } from '../../utils/auth-guard'

import { resolveModelId } from '../../utils/ai-config'
import { getUserNutritionSettings } from '../../utils/nutrition/settings'

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const google = createGoogle({
  apiKey: process.env.GEMINI_API_KEY
})

/**
 * Roughly 8 MB of image once base64 is decoded. The payload is forwarded to a paid vision model, so
 * an unbounded string was both a cost and a memory risk; phone camera JPEGs sit far below this.
 */
const MAX_IMAGE_BASE64_LENGTH = 11_000_000

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

const estimateRequestSchema = z.object({
  imageBase64: z.string().min(1).max(MAX_IMAGE_BASE64_LENGTH),
  mimeType: z.enum(ALLOWED_IMAGE_MIME_TYPES as [string, ...string[]]).optional(),
  context: z
    .object({
      selectedDate: z.string().optional(),
      targetCalories: z.number().optional(),
      targetProtein: z.number().optional(),
      targetCarbs: z.number().optional(),
      targetFat: z.number().optional(),
      todayWorkoutSummary: z.string().optional()
    })
    .optional()
})

const detectedFoodItemSchema = z.object({
  name: z.string().describe('Name of identified food item or ingredient'),
  portion: z.string().optional().describe('Estimated portion size, e.g. 150g or 1 cup'),
  calories: z.number().optional().describe('Estimated calories for this item in kcal')
})

const nutritionEstimateSchema = z.object({
  name: z.string().describe('Descriptive name of the meal or food items identified'),
  calories: z.number().describe('Estimated total calories in kcal'),
  protein: z.number().describe('Estimated protein in grams'),
  carbs: z.number().describe('Estimated carbohydrates in grams'),
  fat: z.number().describe('Estimated fat in grams'),
  meal: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER']).describe('Suggested meal slot'),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Estimation confidence level'),
  coachInsight: z
    .string()
    .describe(
      'A concise 1-2 sentence coach insight about this meal for an endurance athlete (e.g. macro distribution, quality, or fueling timing)'
    ),
  items: z
    .array(detectedFoodItemSchema)
    .optional()
    .describe('Individual food items or components detected on the plate')
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['nutrition:read', 'chat:write'])

  const body = await readBody(event)
  const parsed = estimateRequestSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body. Expected imageBase64 string.'
    })
  }

  const { imageBase64, mimeType = 'image/jpeg', context } = parsed.data

  try {
    // Strip data URI prefix if present
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64

    if (!base64Data) {
      throw createError({
        statusCode: 400,
        message: 'Invalid imageBase64 payload.'
      })
    }

    let promptText =
      'Analyze this meal photo carefully. Identify individual food items on the plate, estimate portion sizes, and return the meal name, total estimated calories (kcal), protein (g), carbs (g), fat (g), suggested meal slot, estimation confidence level, itemized components list, and a concise 1-2 sentence coach insight tailored for an endurance athlete.'

    if (context) {
      const contextLines: string[] = []
      if (context.selectedDate) contextLines.push(`Log Date: ${context.selectedDate}`)
      if (context.targetCalories) {
        contextLines.push(
          `Daily Targets: ${context.targetCalories} kcal (P: ${context.targetProtein || 0}g, C: ${context.targetCarbs || 0}g, F: ${context.targetFat || 0}g)`
        )
      }
      if (context.todayWorkoutSummary)
        contextLines.push(`Today's Workout: ${context.todayWorkoutSummary}`)

      if (contextLines.length > 0) {
        promptText += `\n\nAthlete Daily Context:\n${contextLines.join('\n')}\nUse this context to tailor the coach insight (e.g. post-workout recovery quality, carb filling, or daily target fit).`
      }
    }

    // Read from settings rather than the request body: the constraints are the athlete's, and the
    // coach insight can suggest what to add next time. Every other surface that names food filters
    // on these.
    const settings = await getUserNutritionSettings(user.id)
    const constraints = [
      ...toStringArray(settings.dietaryProfile),
      ...toStringArray(settings.foodAllergies),
      ...toStringArray(settings.foodIntolerances),
      ...toStringArray(settings.lifestyleExclusions)
    ]
    if (constraints.length > 0) {
      promptText += `\n\nDietary constraints (allergies, intolerances, dietary profile): ${constraints.join(', ')}. Never suggest a food that conflicts with these. Describing what is already in the photo is fine; recommending more of it is not.`
    }

    const modelId = resolveModelId('gemini-3.1-flash-lite')
    const result = await generateObject({
      model: google(modelId),
      schema: nutritionEstimateSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: promptText
            },
            {
              type: 'file',
              data: Buffer.from(base64Data, 'base64'),
              mediaType: mimeType
            }
          ]
        }
      ]
    })

    return {
      success: true,
      estimate: result.object
    }
  } catch (error) {
    console.error('Error estimating meal photo:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to analyze meal photo with AI.'
    })
  }
})
