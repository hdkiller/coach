import { getServerSession } from '../../utils/session'
import { plannedWorkoutRepository } from '../../utils/repositories/plannedWorkoutRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Planned Workouts'],
    summary: 'List planned workouts',
    description: 'Returns upcoming planned workouts for the authenticated user.',
    parameters: [
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', default: 10 }
      },
      {
        name: 'startDate',
        in: 'query',
        schema: { type: 'string', format: 'date-time' }
      },
      {
        name: 'endDate',
        in: 'query',
        schema: { type: 'string', format: 'date-time' }
      },
      {
        name: 'independentOnly',
        in: 'query',
        schema: { type: 'boolean' }
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  date: { type: 'string', format: 'date-time' },
                  type: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  durationSec: { type: 'integer', nullable: true },
                  tss: { type: 'number', nullable: true },
                  trainingWeekId: { type: 'string', nullable: true }
                }
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

  const query = getQuery(event)
  const limit = query.limit ? parseInt(query.limit as string) : undefined
  const startDate = query.startDate ? new Date(query.startDate as string) : new Date()
  const endDate = query.endDate ? new Date(query.endDate as string) : undefined
  const independentOnly = query.independentOnly === 'true'

  const userId = (session.user as any).id

  const plannedWorkouts = await plannedWorkoutRepository.list(userId, {
    startDate,
    endDate,
    independentOnly,
    limit
  })

  return plannedWorkouts
})
