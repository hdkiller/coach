import { logWebhookRequest } from '../../../utils/webhook-logger'
import { prisma } from '../../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['OAuth'],
    summary: 'Generic OAuth Webhook',
    description:
      'A generic webhook endpoint for third-party OAuth applications to push data. Captures the raw payload and associates it with the application.',
    parameters: [
      {
        name: 'clientId',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: { description: 'OK' },
      404: { description: 'Application Not Found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  const body = await readBody(event)
  const headers = getRequestHeaders(event)
  const query = getQuery(event)

  // 1. Identify the application
  const app = await prisma.oAuthApp.findUnique({
    where: { clientId }
  })

  if (!app) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Application not found'
    })
  }

  // 2. Check secret (optional for now, but we capture the result)
  // Secret can be in header X-Webhook-Secret or in query param 'secret'
  const providedSecret = (headers['x-webhook-secret'] as string) || (query.secret as string)
  const secretMatched = app.webhookSecret && providedSecret === app.webhookSecret

  // 3. Log the request - set status to PENDING for the worker poller to pick up
  const log = await logWebhookRequest({
    provider: `oauth-generic`,
    eventType: 'RAW_PUSH',
    payload: body,
    headers,
    query,
    status: 'PENDING'
  })

  if (log) {
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: {
        error: secretMatched
          ? 'SECRET_MATCHED'
          : providedSecret
            ? 'SECRET_MISMATCH'
            : 'NO_SECRET_PROVIDED',
        // Also store metadata for generic worker
        eventType: `oauth:${app.name}`
      }
    })
  }

  // Always return 200 OK as per requirement to be developer-friendly
  return {
    status: 'success',
    message: 'Data captured',
    receivedAt: new Date().toISOString(),
    secretMatched
  }
})
