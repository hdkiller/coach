import { logWebhookRequest } from '../../../utils/webhook-logger'
import crypto from 'node:crypto'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Oura webhook',
    description: 'Handles incoming webhook notifications from Oura.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: true
          }
        }
      }
    },
    responses: {
      200: { description: 'OK' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event)
  const headers = getRequestHeaders(event)
  const signature = headers['x-oura-signature']
  const timestamp = headers['x-oura-timestamp'] // Not strictly required for verification if not used in signature construction, but usually is.
  // The example code says: hmac.update(timestamp + JSON.stringify(req.body));
  // So timestamp IS required.
  const clientSecret = process.env.OURA_CLIENT_SECRET

  // 1. Validate Signature
  if (!clientSecret) {
    console.error('[Oura Webhook] Missing OURA_CLIENT_SECRET')
    throw createError({ statusCode: 500, statusMessage: 'Server Configuration Error' })
  }

  if (!signature || !rawBody) {
    // Timestamp might be needed?
    console.warn('[Oura Webhook] Missing signature headers or body')
    await logWebhookRequest({
      provider: 'oura',
      eventType: 'UNKNOWN',
      headers,
      status: 'FAILED',
      error: 'Missing signature headers'
    })
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Oura docs: hmac.update(timestamp + body) (from the snippet in json file)
  // Let's verify if timestamp is in headers.
  if (!timestamp) {
    console.warn('[Oura Webhook] Missing timestamp header')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const payloadToSign = `${timestamp}${rawBody}`
  const calculatedSignature = crypto
    .createHmac('sha256', clientSecret)
    .update(payloadToSign)
    .digest('hex') // Oura example says 'hex', Whoop used 'base64'. Oura example: digest('hex').toUpperCase()??
  // Example: const calculatedSignature = hmac.digest('hex').toUpperCase();
  // I need to be careful with case.

  if (
    calculatedSignature !== signature &&
    calculatedSignature.toUpperCase() !== signature &&
    calculatedSignature.toLowerCase() !== signature
  ) {
    // Try strict match first.
    // If Oura sends uppercase hex, and I generated lowercase.
    // Let's assume standard hex match.
    // I'll check strict equality first, then case insensitive.

    console.warn('[Oura Webhook] Invalid signature', {
      received: signature,
      calculated: calculatedSignature
    })

    await logWebhookRequest({
      provider: 'oura',
      eventType: 'UNKNOWN',
      headers,
      status: 'FAILED',
      error: 'Invalid signature'
    })
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // 2. Parse Body
  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch (e) {
    console.error('[Oura Webhook] Failed to parse JSON body')
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON' })
  }

  const { event_type, data_type, user_id } = body

  // 3. Log Receipt - set status to PENDING for the worker poller to pick up
  await logWebhookRequest({
    provider: 'oura',
    eventType: event_type || 'UNKNOWN',
    payload: body,
    headers,
    status: 'PENDING'
  })

  return 'OK'
})
