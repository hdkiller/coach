import { oauthRepository } from '../../../utils/repositories/oauthRepository'
import { getEffectiveUserId } from '../../../utils/coaching'

defineRouteMeta({
  openAPI: {
    tags: ['Developer'],
    summary: 'Get OAuth Application',
    description: 'Returns details for a specific OAuth application.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
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
                updatedAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not Found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = await getEffectiveUserId(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing app ID' })
  }

  const app = await oauthRepository.getApp(id)

  if (!app) {
    throw createError({ statusCode: 404, message: 'Application not found' })
  }

  if (app.ownerId !== userId) {
    throw createError({ statusCode: 403, message: 'You do not own this application' })
  }

  return app
})
