import { defineEventHandler, createError, getQuery } from 'h3'
import { prisma } from '../../utils/db'
import { getServerSession } from '../../utils/session'

defineRouteMeta({
  openAPI: {
    tags: ['Workouts'],
    summary: 'Get workout tags',
    description: 'Returns distinct workout tags and counts for the authenticated user.',
    parameters: [
      {
        name: 'q',
        in: 'query',
        schema: { type: 'string' }
      },
      {
        name: 'includeIcu',
        in: 'query',
        schema: { type: 'boolean', default: true }
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
                  value: { type: 'string' },
                  count: { type: 'integer' }
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
  const user = session?.user as any

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const query = getQuery(event)
  const includeIcu = query.includeIcu !== 'false'
  const search = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''

  const rows = await prisma.$queryRaw<Array<{ value: string; count: bigint }>>`
    SELECT tag AS value, COUNT(*)::bigint AS count
    FROM "Workout",
         UNNEST("tags") AS tag
    WHERE "userId" = ${user.id}
      AND "isDuplicate" = false
      AND (${includeIcu} = true OR tag NOT LIKE 'icu:%')
      AND (${search} = '' OR tag LIKE ${`%${search}%`})
    GROUP BY tag
    ORDER BY COUNT(*) DESC, tag ASC
  `

  return rows.map((row) => ({
    value: row.value,
    count: Number(row.count)
  }))
})
