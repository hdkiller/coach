import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { getUserLocalDate } from '../../utils/date'
import { metabolicService } from '../../utils/services/metabolicService'

defineRouteMeta({
  openAPI: {
    tags: ['Nutrition'],
    summary: 'Generate fueling plan',
    description: 'Generates fueling plan synchronously for a target date.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                format: 'date-time',
                description: 'The date to generate plan for (defaults to today)'
              }
            }
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
                message: { type: 'string' },
                runId: { type: 'string', nullable: true }
              }
            }
          }
        }
      },
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

  const userId = (session.user as any).id
  const body = (await readBody(event)) || {}

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true }
  })
  const timezone = user?.timezone ?? 'UTC'

  const targetDate = body.date ? new Date(body.date) : getUserLocalDate(timezone)
  const normalizedDate = new Date(
    Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate())
  )

  const result = await metabolicService.calculateFuelingPlanForDate(userId, normalizedDate, {
    persist: true
  })

  return {
    success: true,
    message: result.skipped
      ? 'Fueling plan is manually locked for this day. Keeping existing values.'
      : 'Fueling plan generated in real time.',
    runId: null
  }
})
