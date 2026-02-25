import { logWebhookRequest } from '../../../utils/webhook-logger'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Whoop async webhook',
    description:
      'Handles incoming webhook notifications from Whoop. Data is stored in SQL and processed asynchronously.',
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
      200: { description: 'OK' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const headers = getRequestHeaders(event)

  try {
    // Log the request to SQL with status PENDING for the worker to pick up
    await logWebhookRequest({
      provider: 'whoop',
      eventType: body?.type || 'UNKNOWN',
      payload: body,
      headers,
      status: 'PENDING'
    })
  } catch (error: any) {
    console.error('[Whoop Webhook Async] Failed to log request:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }

  return 'OK'
})
