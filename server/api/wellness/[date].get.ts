import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Wellness'],
    summary: 'Get wellness by date',
    description: 'Returns wellness metrics for a specific date.',
    parameters: [
      {
        name: 'date',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'date' },
        description: 'Date in YYYY-MM-DD format'
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              nullable: true,
              properties: {
                hrv: { type: 'number', nullable: true },
                restingHr: { type: 'integer', nullable: true },
                sleepScore: { type: 'integer', nullable: true },
                hoursSlept: { type: 'number', nullable: true },
                recoveryScore: { type: 'integer', nullable: true }
              }
            }
          }
        }
      },
      400: { description: 'Invalid date format' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user) {
    throw createError({ 
      statusCode: 401,
      message: 'Unauthorized' 
    })
  }
  
  const dateParam = getRouterParam(event, 'date')
  if (!dateParam) {
    throw createError({
      statusCode: 400,
      message: 'Date parameter is required'
    })
  }
  
  const date = new Date(dateParam)
  if (isNaN(date.getTime())) {
    throw createError({
      statusCode: 400,
      message: 'Invalid date format'
    })
  }
  
  const userId = (session.user as any).id
  
  // Try to get wellness data first
  const wellness = await wellnessRepository.findFirst(userId, { date })
  
  // Fall back to daily metrics if wellness not found
  if (!wellness) {
    const dailyMetric = await prisma.dailyMetric.findFirst({
      where: {
        userId,
        date
      }
    })
    
    if (dailyMetric) {
      return {
        hrv: dailyMetric.hrv,
        restingHr: dailyMetric.restingHr,
        sleepScore: dailyMetric.sleepScore,
        hoursSlept: dailyMetric.hoursSlept,
        recoveryScore: dailyMetric.recoveryScore,
        weight: null
      }
    }
    
    return null
  }
  
  // Return wellness data
  return {
    hrv: wellness.hrv,
    restingHr: wellness.restingHr,
    sleepScore: wellness.sleepQuality ?? wellness.sleepScore,
    hoursSlept: wellness.sleepHours,
    recoveryScore: wellness.recoveryScore,
    weight: wellness.weight,
    soreness: wellness.soreness,
    fatigue: wellness.fatigue,
    stress: wellness.stress,
    mood: wellness.mood,
    motivation: wellness.motivation,
    readiness: wellness.readiness
  }
})