import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { wellnessRepository } from '../../utils/repositories/wellnessRepository'

const wellnessUploadSchema = z.object({
  date: z.string(), // ISO date or YYYY-MM-DD
  hrv: z.number().optional(),
  hrvSdnn: z.number().optional(),
  restingHr: z.number().int().optional(),
  avgSleepingHr: z.number().int().optional(),
  sleepScore: z.number().int().optional(),
  sleepHours: z.number().optional(),
  sleepSecs: z.number().int().optional(),
  sleepQuality: z.number().int().optional(),
  readiness: z.number().int().optional(),
  recoveryScore: z.number().int().optional(),
  weight: z.number().optional(),
  bodyFat: z.number().optional(),
  abdomen: z.number().optional(),
  bloodGlucose: z.number().optional(),
  skinTemp: z.number().optional(),
  respiration: z.number().optional(),
  spO2: z.number().optional(),
  vo2max: z.number().optional(),
  systolic: z.number().int().optional(),
  diastolic: z.number().int().optional(),
  lactate: z.number().optional(),
  hydrationVolume: z.number().optional(),
  ctl: z.number().optional(),
  atl: z.number().optional(),
  stress: z.number().int().optional(),
  mood: z.number().int().optional(),
  motivation: z.number().int().optional(),
  fatigue: z.number().int().optional(),
  soreness: z.number().int().optional(),
  injury: z.string().optional(),
  menstrualPhase: z.string().optional(),
  comments: z.string().optional(),
  rawJson: z.any().optional()
})

defineRouteMeta({
  openAPI: {
    tags: ['Wellness'],
    summary: 'Upload wellness data',
    description: 'Logs or updates wellness metrics for a specific date.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/WellnessUpload'
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
          WellnessUpload: {
            type: 'object',
            required: ['date'],
            properties: {
              date: { type: 'string', format: 'date', description: 'YYYY-MM-DD or ISO string' },
              hrv: { type: 'number', description: 'Heart Rate Variability (ms)' },
              hrvSdnn: { type: 'number', description: 'Standard deviation of NN intervals (ms)' },
              restingHr: { type: 'integer', description: 'Resting Heart Rate (bpm)' },
              avgSleepingHr: { type: 'integer', description: 'Average HR during sleep (bpm)' },
              sleepScore: { type: 'integer', description: 'Sleep quality score (1-100)' },
              sleepHours: { type: 'number', description: 'Total sleep duration in hours' },
              sleepSecs: { type: 'integer', description: 'Total sleep duration in seconds' },
              sleepQuality: { type: 'integer', description: 'Subjective sleep quality (1-10)' },
              readiness: { type: 'integer', description: 'Overall readiness score (1-100)' },
              recoveryScore: { type: 'integer', description: 'Recovery score (1-100)' },
              weight: { type: 'number', description: 'Body weight (kg)' },
              bodyFat: { type: 'number', description: 'Body fat percentage (%)' },
              bloodGlucose: { type: 'number', description: 'Blood glucose levels' },
              skinTemp: { type: 'number', description: 'Skin temperature deviation (Celsius)' },
              respiration: { type: 'number', description: 'Respiratory rate (breaths per min)' },
              spO2: { type: 'number', description: 'Blood oxygen saturation (%)' },
              vo2max: { type: 'number', description: 'Estimated VO2 Max' },
              systolic: { type: 'integer', description: 'Systolic blood pressure' },
              diastolic: { type: 'integer', description: 'Diastolic blood pressure' },
              ctl: { type: 'number', description: 'Chronic Training Load (Fitness)' },
              atl: { type: 'number', description: 'Acute Training Load (Fatigue)' },
              stress: { type: 'integer', description: 'Subjective stress level (1-10)' },
              mood: { type: 'integer', description: 'Subjective mood level (1-10)' },
              motivation: { type: 'integer', description: 'Subjective motivation (1-10)' },
              fatigue: { type: 'integer', description: 'Subjective fatigue (1-10)' },
              soreness: { type: 'integer', description: 'Subjective soreness (1-10)' },
              comments: { type: 'string', description: 'User notes or journal entry' },
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
  // Check authentication (supports Session, API Key, and OAuth Token)
  const user = await requireAuth(event, ['health:write'])

  const body = await readBody(event)
  const result = wellnessUploadSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid wellness data',
      data: result.error.issues
    })
  }

  const { date, rawJson, ...data } = result.data

  // Ensure date is UTC midnight for wellness
  const parsedDate = new Date(date)
  const targetDate = new Date(
    Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate())
  )

  const { record } = await wellnessRepository.upsert(
    user.id,
    targetDate,
    { ...data, userId: user.id, date: targetDate, rawJson: rawJson || null },
    { ...data, rawJson: rawJson || null },
    event.context.authType === 'oauth' ? `oauth:${event.context.oauthAppId}` : 'manual'
  )

  return {
    success: true,
    data: record
  }
})
