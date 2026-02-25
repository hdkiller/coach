import { logWebhookRequest } from '../../../utils/webhook-logger'
import crypto from 'node:crypto'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Whoop webhook',
    description: 'Handles incoming webhook notifications from Whoop.',
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
  const signature = headers['x-whoop-signature']
  const timestamp = headers['x-whoop-signature-timestamp']
  const clientSecret = process.env.WHOOP_CLIENT_SECRET

  // 1. Validate Signature
  if (!clientSecret) {
    console.error('[Whoop Webhook] Missing WHOOP_CLIENT_SECRET')
    throw createError({ statusCode: 500, statusMessage: 'Server Configuration Error' })
  }

  if (!signature || !timestamp || !rawBody) {
    console.warn('[Whoop Webhook] Missing signature headers or body')
    await logWebhookRequest({
      provider: 'whoop',
      eventType: 'UNKNOWN',
      headers,
      status: 'FAILED',
      error: 'Missing signature headers'
    })
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const payloadToSign = timestamp + rawBody
  const calculatedSignature = crypto
    .createHmac('sha256', clientSecret)
    .update(payloadToSign)
    .digest('base64')

  if (calculatedSignature !== signature) {
    console.warn('[Whoop Webhook] Invalid signature')
    await logWebhookRequest({
      provider: 'whoop',
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
    console.error('[Whoop Webhook] Failed to parse JSON body')
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON' })
  }

  const { user_id, type } = body

  // 3. Log Receipt - set status to PENDING for the worker to pick up
  await logWebhookRequest({
    provider: 'whoop',
    eventType: type || 'UNKNOWN',
    payload: body,
    headers,
    status: 'PENDING'
  })

  return 'OK'
})
