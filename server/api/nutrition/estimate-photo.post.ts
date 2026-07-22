import { z } from 'zod/v3'
import { generateObject } from 'ai'
import { createGoogle } from '@ai-sdk/google'
import { requireAuth } from '../../utils/auth-guard'

import { resolveModelId } from '../../utils/ai-config'

const google = createGoogle({
  apiKey: process.env.GEMINI_API_KEY
})

const estimateRequestSchema = z.object({
  imageBase64: z.string(),
  mimeType: z.string().optional()
})

const nutritionEstimateSchema = z.object({
  name: z.string().describe('Descriptive name of the meal or food items identified'),
  calories: z.number().describe('Estimated total calories in kcal'),
  protein: z.number().describe('Estimated protein in grams'),
  carbs: z.number().describe('Estimated carbohydrates in grams'),
  fat: z.number().describe('Estimated fat in grams'),
  meal: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER']).describe('Suggested meal slot'),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Estimation confidence level')
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

  const { imageBase64, mimeType = 'image/jpeg' } = parsed.data

  try {
    // Strip data URI prefix if present
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64

    if (!base64Data) {
      throw createError({
        statusCode: 400,
        message: 'Invalid imageBase64 payload.'
      })
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
              text: 'Analyze this meal photo carefully. Identify the food items, estimate portion sizes, and return the meal name, estimated calories (kcal), protein (g), carbs (g), fat (g), and suggested meal slot.'
            },
            {
              type: 'image',
              image: Buffer.from(base64Data, 'base64'),
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
