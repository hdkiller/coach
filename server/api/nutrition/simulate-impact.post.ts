import { getServerSession } from '../../utils/session'
import { getUserLocalDate, getUserTimezone } from '../../utils/date'
import { metabolicService } from '../../utils/services/metabolicService'
import { ABSORPTION_PROFILES, type AbsorptionType } from '../../utils/nutrition-domain'

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
            required: ['carbs', 'absorptionType'],
            properties: {
              date: { type: 'string', format: 'date' },
              carbs: { type: 'number' },
              absorptionType: { type: 'string' },
              time: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Success' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const body = await readBody(event)

  const timezone = await getUserTimezone(userId)
  const date = body.date ? new Date(body.date) : getUserLocalDate(timezone)

  const now = new Date()
  const ghostTime = body.time ? new Date(body.time) : new Date(now.getTime() + 15 * 60000)

  const profile =
    ABSORPTION_PROFILES[body.absorptionType as AbsorptionType] || ABSORPTION_PROFILES.BALANCED

  const points = await metabolicService.simulateMealImpact(userId, date, {
    totalCarbs: body.carbs,
    totalKcal: body.carbs * 4,
    profile,
    time: ghostTime
  })

  return {
    success: true,
    points
  }
})
