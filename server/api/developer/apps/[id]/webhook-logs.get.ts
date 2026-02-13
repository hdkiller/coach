import { oauthRepository } from '../../../../utils/repositories/oauthRepository'
import { getEffectiveUserId } from '../../../../utils/coaching'
import { prisma } from '../../../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Developer'],
    summary: 'Get OAuth Application Webhook Logs',
    description: 'Returns recent webhook logs for a specific OAuth application.',
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
                  provider: { type: 'string' },
                  eventType: { type: 'string' },
                  payload: { type: 'object' },
                  headers: { type: 'object' },
                  query: { type: 'object' },
                  status: { type: 'string' },
                  error: { type: 'string' },
                  processedAt: { type: 'string', format: 'date-time' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
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

  // Only owner or admin can see logs
  if (app.ownerId !== userId) {
    // Check if admin
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
    if (!user?.isAdmin) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to view logs for this application'
      })
    }
  }

  // Fetch recent logs for this app
  // Provider is stored as `oauth:${app.name}`
  const logs = await prisma.webhookLog.findMany({
    where: {
      provider: `oauth:${app.name}`
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50
  })

  return logs
})
