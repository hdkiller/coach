import { z } from 'zod/v3'
import { requireAuth } from '../../utils/auth-guard'
import {
  attributeReferral,
  attributeReferralFromEvent,
  clearReferralViaCookie,
  normalizeReferralCode,
  normalizeReferralSource,
  readReferralViaFromEvent
} from '../../utils/referrals'

defineRouteMeta({
  openAPI: {
    tags: ['Referrals'],
    summary: 'Claim pending athlete referral attribution',
    description:
      'Attributes the current user to a referrer using the via cookie and/or request body. First-touch only; no rewards granted.',
    responses: {
      200: {
        description: 'Claim attempt result',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['attributed', 'already_attributed', 'ignored']
                },
                reason: { type: 'string' }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

const bodySchema = z
  .object({
    via: z.string().optional(),
    source: z.string().optional().nullable()
  })
  .optional()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:read'])
  const parsed = bodySchema.safeParse(await readBody(event).catch(() => ({})))
  const body = parsed.success ? parsed.data : undefined

  const fromCookie = readReferralViaFromEvent(event)
  const code = normalizeReferralCode(body?.via) || fromCookie.code
  const source = body?.source ? normalizeReferralSource(body.source) : fromCookie.source

  const result = code
    ? await attributeReferral({
        refereeUserId: user.id,
        code,
        source
      })
    : await attributeReferralFromEvent(event, user.id)

  if (result.status === 'attributed' || result.status === 'already_attributed') {
    clearReferralViaCookie(event)
  }

  if (result.status === 'ignored') {
    return { status: result.status, reason: result.reason }
  }

  return { status: result.status }
})
