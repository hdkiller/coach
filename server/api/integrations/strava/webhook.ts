import { logWebhookRequest } from '../../../utils/webhook-logger'

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

    // Log receipt - set status to PENDING for the worker to pick up
    await logWebhookRequest({
      provider: 'strava',
      eventType: body?.object_type ? `${body.object_type}:${body.aspect_type}` : 'UNKNOWN',
      payload: body,
      headers,
      status: 'PENDING'
    })

    return 'OK'
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed'
  })
})
