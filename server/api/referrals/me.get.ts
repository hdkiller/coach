import { requireAuth } from '../../utils/auth-guard'
import { getMyReferralPayload, normalizeReferralSource } from '../../utils/referrals'

defineRouteMeta({
  openAPI: {
    tags: ['Referrals'],
    summary: 'Get my athlete referral share link',
    description:
      'Returns the authenticated athlete’s stable referral code and share URL. Lazily mints a code on first fetch.',
    parameters: [
      {
        in: 'query',
        name: 'medium',
        schema: { type: 'string', enum: ['mobile_qr', 'web_share', 'link'] },
        description: 'UTM medium baked into the share URL'
      }
    ],
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
  const user = await requireAuth(event, ['profile:read'])
  const query = getQuery(event)
  const medium = normalizeReferralSource(query.medium)
  return await getMyReferralPayload(user.id, medium)
})
