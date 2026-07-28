import { z } from 'zod'
import { getServerSession } from '../../utils/session'
import { getUserLocalDate, getUserTimezone } from '../../utils/date'
import { metabolicService } from '../../utils/services/metabolicService'
import { ABSORPTION_PROFILES, type AbsorptionType } from '../../utils/nutrition-domain'

const simulateImpactSchema = z.object({
  carbs: z
    .number({ message: 'Carbs is required' })
    .finite('Carbs must be a finite number')
    .min(0, 'Carbs cannot be negative')
    .max(1000, 'Carbs cannot exceed 1000g'),
  absorptionType: z.enum(['RAPID', 'FAST', 'BALANCED', 'DENSE', 'HYPER_LOAD']).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .refine((s) => {
      const d = new Date(`${s}T00:00:00.000Z`)
      return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
    }, 'Invalid calendar date (YYYY-MM-DD)')
    .optional(),
  time: z.string().datetime({ offset: true }).optional()
})

defineRouteMeta({
  openAPI: {
    tags: ['Nutrition'],
    summary: 'Simulate meal impact',
    description: 'Returns simulated metabolic points for a potential meal.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['carbs'],
            properties: {
              date: { type: 'string', format: 'date' },
              carbs: { type: 'number', minimum: 0, maximum: 1000 },
              absorptionType: {
                type: 'string',
                enum: ['RAPID', 'FAST', 'BALANCED', 'DENSE', 'HYPER_LOAD']
              },
              time: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Success' },
      400: { description: 'Invalid data' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const result = simulateImpactSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      message: 'Invalid request body',
      data: result.error.issues
    })
  }

  const { carbs, absorptionType, date: dateStr, time: timeStr } = result.data

  const userId = (session.user as any).id
  const timezone = await getUserTimezone(userId)
  const date = dateStr ? new Date(dateStr) : getUserLocalDate(timezone)

  const now = new Date()
  const ghostTime = timeStr ? new Date(timeStr) : new Date(now.getTime() + 15 * 60000)

  const profile =
    ABSORPTION_PROFILES[(absorptionType as AbsorptionType) || 'BALANCED'] ||
    ABSORPTION_PROFILES.BALANCED

  const points = await metabolicService.simulateMealImpact(userId, date, {
    totalCarbs: carbs,
    totalKcal: carbs * 4,
    profile,
    time: ghostTime
  })

  return {
    success: true,
    points
  }
})
