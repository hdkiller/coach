import { oauthRepository } from '../../../utils/repositories/oauthRepository'
import { getEffectiveUserId } from '../../../utils/coaching'

defineRouteMeta({
  openAPI: {
    tags: ['Developer'],
    summary: 'List OAuth Applications',
    description: 'Returns a list of OAuth applications owned by the authenticated user.',
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
                  name: { type: 'string' },
                  sourceName: { type: 'string', nullable: true },
                  description: { type: 'string', nullable: true },
                  homepageUrl: { type: 'string', nullable: true },
                  logoUrl: { type: 'string', nullable: true },
                  clientId: { type: 'string' },
                  redirectUris: { type: 'array', items: { type: 'string' } },
                  isTrusted: { type: 'boolean' },
                  isPublic: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  _count: {
                    type: 'object',
                    properties: {
                      tokens: { type: 'integer' },
                      consents: { type: 'integer' }
                    }
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
  const userId = await getEffectiveUserId(event)
  return await oauthRepository.listAppsForUser(userId)
})
