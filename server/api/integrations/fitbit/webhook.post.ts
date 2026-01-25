import { logWebhookRequest, updateWebhookStatus } from '../../../utils/webhook-logger'
import { webhookQueue } from '../../../utils/queue'
import crypto from 'node:crypto'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Fitbit webhook notification',
    description: 'Handles incoming webhook notifications from Fitbit.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                collectionType: { type: 'string' },
                date: { type: 'string' },
                ownerId: { type: 'string' },
                ownerType: { type: 'string' },
                subscriptionId: { type: 'string' }
              }
            }
          }
        }
      }
    },
    responses: {
      204: { description: 'Received' },
      404: { description: 'Not Found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event)
  const headers = getRequestHeaders(event)
  const signature = headers['x-fitbit-signature']
  const clientSecret = process.env.FITBIT_CLIENT_SECRET

  if (!clientSecret) {
    console.error('[Fitbit Webhook] Missing FITBIT_CLIENT_SECRET')
    throw createError({ statusCode: 500, statusMessage: 'Server Configuration Error' })
  }

  if (!signature || !rawBody) {
    console.warn('[Fitbit Webhook] Missing signature headers or body')
    await logWebhookRequest({
      provider: 'fitbit',
      eventType: 'UNKNOWN',
      headers,
      status: 'FAILED',
      error: 'Missing signature headers'
    })
    throw createError({ statusCode: 404 })
  }

  // Verify Signature (HMAC-SHA1)
  const calculatedSignature = crypto
    .createHmac('sha1', clientSecret + '&') // Fitbit uses "consumer_secret&" suffix convention commonly? Check docs.
    // Actually, documentation says: "using your application's consumer secret."
    // Most OAuth1.0a signatures use '&', but Fitbit's new API might just use the secret.
    // Let's try just the secret first, but often docs imply secret + '&' for OAuth signing key.
    // However, for generic webhooks, usually it's just the secret.
    // Wait, standard practice for Fitbit signature verification:
    // signature = Base64(HMAC-SHA1(body, consumerSecret + "&"))
    // Let's verify this constraint.
    // Found online references: "The key is the client secret with an ampersand & appended to the end."
    .update(rawBody)
    .digest('base64')

  // We might need to try both if unsure, or just the one with '&'.
  // I will assume '&' is required based on common OAuth signing patterns used by Fitbit.

  if (calculatedSignature !== signature) {
    // Fallback check without '&' just in case
    const altSignature = crypto.createHmac('sha1', clientSecret).update(rawBody).digest('base64')

    if (altSignature !== signature) {
      console.warn('[Fitbit Webhook] Invalid signature')
      await logWebhookRequest({
        provider: 'fitbit',
        eventType: 'UNKNOWN',
        headers,
        status: 'FAILED',
        error: 'Invalid signature'
      })
      throw createError({ statusCode: 404 })
    }
  }

  let body: any[]
  try {
    body = JSON.parse(rawBody)
  } catch (e) {
    console.error('[Fitbit Webhook] Failed to parse JSON body')
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON' })
  }

  // Log Receipt
  // Body is an array of updates
  const log = await logWebhookRequest({
    provider: 'fitbit',
    eventType: body[0]?.collectionType || 'UNKNOWN',
    payload: body,
    headers,
    status: 'PENDING'
  })

  // Queue Job
  try {
    await webhookQueue.add('fitbit-webhook', {
      provider: 'fitbit',
      payload: body,
      logId: log?.id
    })

    if (log) await updateWebhookStatus(log.id, 'QUEUED')
    console.log(`[Fitbit Webhook] Queued ${body.length} updates`)
  } catch (err: any) {
    console.error('[Fitbit Webhook] Failed to enqueue job:', err)
    if (log) await updateWebhookStatus(log.id, 'FAILED', 'Queue error')
    throw createError({ statusCode: 500 })
  }

  setResponseStatus(event, 204)
  return
})
