import { logWebhookRequest, updateWebhookStatus } from '../../../utils/webhook-logger'
import { webhookQueue } from '../../../utils/queue'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Strava Webhook',
    description: 'Handles Strava webhook validation (GET) and event processing (POST).',
    responses: {
      200: { description: 'OK' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    // Handle validation
    const query = getQuery(event)
    const mode = query['hub.mode']
    const token = query['hub.verify_token']
    const challenge = query['hub.challenge']

    const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[Strava Webhook] Validation successful')
      // Return 200 with the challenge in the body
      // Response must be application/json: { "hub.challenge": "..." }
      return { 'hub.challenge': challenge }
    } else {
      console.warn('[Strava Webhook] Validation failed: invalid token or mode', { mode, token })
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const headers = getRequestHeaders(event)

    // Log receipt
    const log = await logWebhookRequest({
      provider: 'strava',
      eventType: body?.object_type ? `${body.object_type}:${body.aspect_type}` : 'UNKNOWN',
      payload: body,
      headers,
      status: 'PENDING'
    })

    try {
      if (!body || !body.owner_id) {
        console.warn('[Strava Webhook] Missing owner_id in payload')
        if (log) await updateWebhookStatus(log.id, 'FAILED', 'Missing owner_id')
        return 'OK'
      }

      // Enqueue in the background worker queue
      await webhookQueue.add('strava-webhook', {
        provider: 'strava',
        payload: body,
        headers,
        logId: log?.id
      })

      return 'OK'
    } catch (error: any) {
      console.error('[Strava Webhook] Error enqueuing job:', error)
      if (log) await updateWebhookStatus(log.id, 'FAILED', error.message)
      return 'OK' // Still return 200 to Strava
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed'
  })
})
