import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { teamRepository } from '../../../utils/repositories/teamRepository'

const acceptInviteSchema = z.object({
  code: z.string().min(8).max(10)
})

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Teams'],
    summary: 'Accept team invite',
    description: 'Joins a team using an invite code.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['code'],
            properties: {
              code: { type: 'string' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Success' },
      400: { description: 'Invalid code' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const result = acceptInviteSchema.safeParse(body)

  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Invalid code format' })
  }

  try {
    return await teamRepository.acceptInvite(user.id, result.data.code)
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message })
  }
})
