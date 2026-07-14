import { requireAuth } from '../../../utils/auth-guard'
import { coachingRepository } from '../../../utils/repositories/coachingRepository'
import { enforceInviteRedemptionRateLimit } from '../../../utils/invite-redemption-rate-limit'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'Connect athlete',
    description: 'Connects a coach to an athlete using an invite code.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['code'],
            properties: {
              code: { type: 'string', description: 'The invite code' }
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
                athlete: { type: 'object' }
              }
            }
          }
        }
      },
      400: { description: 'Invalid code or request' },
      401: { description: 'Unauthorized' },
      429: { description: 'Too many attempts' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  enforceInviteRedemptionRateLimit(event, user.id)

  const { code } = await readBody(event)

  if (!code) {
    throw createError({ statusCode: 400, message: 'Invite code is required' })
  }

  try {
    return await coachingRepository.connectAthleteWithCode(user.id, code)
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message })
  }
})
