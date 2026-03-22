import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { teamRepository } from '../../../utils/repositories/teamRepository'

const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional()
})

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Teams'],
    summary: 'Create team',
    description: 'Creates a new team and assigns the authenticated user as the owner.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', minLength: 2, maxLength: 100 },
              description: { type: 'string', maxLength: 500 }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Created',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' }
              }
            }
          }
        }
      },
      400: { description: 'Invalid input' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])

  const body = await readBody(event)
  const result = createTeamSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: result.error.issues
    })
  }

  const team = await teamRepository.createTeam(user.id, result.data)

  setResponseStatus(event, 201)
  return team
})
