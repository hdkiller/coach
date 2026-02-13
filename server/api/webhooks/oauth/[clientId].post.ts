import { logWebhookRequest } from '../../../utils/webhook-logger'
import { prisma } from '../../../utils/db'
import { webhookQueue } from '../../../utils/queue'

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

  // 3. Log the request
  const log = await logWebhookRequest({
    provider: `oauth:${app.name}`,
    eventType: 'RAW_PUSH',
    payload: body,
    headers,
    query,
    status: 'PROCESSED'
    // We store the secret match info in the metadata/error field or just let it be part of the payload/headers
  })

  // Update log with match status in metadata if we want to be explicit

  if (log) {
    await prisma.webhookLog.update({
      where: { id: log.id },

      data: {
        error: secretMatched
          ? 'SECRET_MATCHED'
          : providedSecret
            ? 'SECRET_MISMATCH'
            : 'NO_SECRET_PROVIDED'
      }
    })

    // 4. Add to queue for background processing

    await webhookQueue.add('oauth-webhook', {
      provider: 'oauth-generic',

      appName: app.name,

      clientId: app.clientId,

      payload: body,

      headers,

      query,

      logId: log.id,

      secretMatched
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
