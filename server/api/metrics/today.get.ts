import { getServerSession } from '#auth'

defineRouteMeta({
  openAPI: {
    tags: ['Metrics'],
    summary: 'Get today\'s wellness metrics',
    description: 'Returns the wellness and recovery metrics for the current day.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                date: { type: 'string', format: 'date-time' },
                hrv: { type: 'number', nullable: true },
                restingHr: { type: 'integer', nullable: true },
                sleepScore: { type: 'integer', nullable: true },
                readiness: { type: 'integer', nullable: true },
                recoveryScore: { type: 'integer', nullable: true }
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
  
  const today = new Date()
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  
  const metric = await prisma.wellness.findUnique({
    where: {
      userId_date: {
        userId: (session.user as any).id,
        date: todayDateOnly
      }
    }
  })
  
  return metric
})