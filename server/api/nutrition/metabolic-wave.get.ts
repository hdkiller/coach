import { getServerSession } from '../../utils/session'
import { metabolicService } from '../../utils/services/metabolicService'

defineRouteMeta({
  openAPI: {
    tags: ['Nutrition'],
    summary: 'Get metabolic wave for range',
    description: 'Returns continuous metabolic points for a specific date range.',
    parameters: [
      {
        name: 'startDate',
        in: 'query',
        required: true,
        schema: { type: 'string', format: 'date' }
      },
      {
        name: 'endDate',
        in: 'query',
        required: true,
        schema: { type: 'string', format: 'date' }
      }
    ],
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
  const query = getQuery(event)
  const startStr = query.startDate as string
  const endStr = query.endDate as string

  if (!startStr || !endStr) {
    throw createError({ statusCode: 400, message: 'Start and End date required' })
  }

  const startDate = new Date(`${startStr}T00:00:00Z`)
  const endDate = new Date(`${endStr}T00:00:00Z`)

  const points = await metabolicService.getWaveRange(userId, startDate, endDate)

  return {
    success: true,
    points
  }
})
