import { requireAuth } from '../../../utils/auth-guard'
import {
  buildReferralShareUrl,
  normalizeReferralSource,
  regenerateUserReferralCode
} from '../../../utils/referrals'
import { prisma } from '../../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Referrals'],
    summary: 'Regenerate my athlete referral code',
    description:
      'Rotates the authenticated athlete’s referral code. Prior share links stop attributing new signups.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                shareUrl: { type: 'string' },
                stats: {
                  type: 'object',
                  properties: {
                    attributedCount: { type: 'integer' }
                  }
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
  const user = await requireAuth(event, ['profile:write'])
  const query = getQuery(event)
  const medium = normalizeReferralSource(query.medium)
  const code = await regenerateUserReferralCode(user.id)
  const attributedCount = await prisma.referral.count({
    where: { referrerUserId: user.id, status: 'ATTRIBUTED' }
  })

  return {
    code,
    shareUrl: buildReferralShareUrl(code, medium),
    stats: { attributedCount }
  }
})
