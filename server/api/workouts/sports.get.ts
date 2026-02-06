import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../utils/db'
import { getServerSession } from '../../utils/session'

defineRouteMeta({
  openAPI: {
    tags: ['Workouts'],
    summary: 'Get unique sport types',
    description: 'Returns a list of unique sport types for the authenticated user.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: { type: 'string' }
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
  const user = session?.user as any

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const sports = await prisma.workout.findMany({
    where: {
      userId: user.id,
      isDuplicate: false,
      type: { not: null }
    },
    distinct: ['type'],
    select: {
      type: true
    },
    orderBy: {
      type: 'asc'
    }
  })

  return sports.map((s) => s.type)
})
