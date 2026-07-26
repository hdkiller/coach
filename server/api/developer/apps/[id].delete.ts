import { requireAuth } from '../../../utils/auth-guard'
import { oauthRepository } from '../../../utils/repositories/oauthRepository'
import { getEffectiveUserId } from '../../../utils/coaching'
import { logAction } from '../../../utils/audit'

defineRouteMeta({
  openAPI: {
    tags: ['Developer'],
    summary: 'Delete OAuth Application',
    description: 'Deletes a specific OAuth application and all associated tokens.',
    responses: {
      204: { description: 'No Content' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not Found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const userId = await getEffectiveUserId(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing app ID' })
  }

  try {
    await oauthRepository.deleteApp(id, userId)

    await logAction({
      userId,
      action: 'OAUTH_APP_DELETED',
      resourceType: 'OAuthApp',
      resourceId: id,
      event
    })

    setResponseStatus(event, 204)
    return null
  } catch (error: any) {
    throw createError({
      statusCode: error.message.includes('permission') ? 403 : 404,
      message: error.message
    })
  }
})
