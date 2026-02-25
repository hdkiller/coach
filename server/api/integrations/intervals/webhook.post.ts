import { logWebhookRequest } from '../../../utils/webhook-logger'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Intervals.icu webhook',
    description:
      'Handles incoming webhook notifications from Intervals.icu for activities, calendar, and wellness updates.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              secret: { type: 'string' },
              events: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    athlete_id: { type: 'string' },
                    type: { type: 'string' },
                    timestamp: { type: 'string' }
                  }
                }
              }
            }
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
  const secret = process.env.INTERVALS_WEBHOOK_SECRET

  const body = await readBody(event)
  const headers = getRequestHeaders(event)

  if (!body || body.secret !== secret) {
    console.warn('[Intervals Webhook] Unauthorized or missing secret')
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Invalid secret'
    })
  }

  // Log receipt - set status to PENDING for the worker to pick up
  await logWebhookRequest({
    provider: 'intervals',
    eventType: body?.events?.[0]?.type || 'UNKNOWN',
    payload: body,
    headers,
    status: 'PENDING'
  })

  return 'OK'
})
