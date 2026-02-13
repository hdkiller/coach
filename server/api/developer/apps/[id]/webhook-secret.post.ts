import { oauthRepository } from '../../../../utils/repositories/oauthRepository'
import { getEffectiveUserId } from '../../../../utils/coaching'
import { logAction } from '../../../../utils/audit'

defineRouteMeta({
  openAPI: {
    tags: ['Developer'],
    summary: 'Regenerate Webhook Secret',
    description:
      'Generates a new incoming webhook secret for the application. The old secret will be invalidated immediately.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                webhookSecret: { type: 'string' }
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

  try {
    const newSecret = await oauthRepository.regenerateWebhookSecret(id, userId)

    await logAction({
      userId,
      action: 'OAUTH_APP_WEBHOOK_SECRET_REGENERATED',
      resourceType: 'OAuthApp',
      resourceId: id,
      event
    })

    return { webhookSecret: newSecret }
  } catch (error: any) {
    throw createError({
      statusCode: error.message.includes('permission') ? 403 : 404,
      message: error.message
    })
  }
})
